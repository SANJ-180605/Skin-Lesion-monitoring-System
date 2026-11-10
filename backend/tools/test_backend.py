import os
import sys
import asyncio
from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.ml.model_loader import load_unet_model, load_classification_model
from app.config import settings
from app.database import connect_to_database

async def run_tests():
    print("Pre-initializing database and models...")
    await connect_to_database()
    load_unet_model(settings.UNET_MODEL_PATH)
    load_classification_model(settings.CLASSIFICATION_MODEL_PATH)
    
    print("Testing API endpoints with ASGITransport...")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Health
        r_health = await client.get("/api/health")
        print(" Health endpoint:", r_health.status_code, r_health.json()["status"])
        assert r_health.status_code == 200
        
        # 2. Models Status
        r_models = await client.get("/api/models/status")
        m_data = r_models.json()
        print(" Models status:", r_models.status_code)
        print("   - U-Net:", m_data["unet_segmentation"]["status"])
        print("   - EfficientNet:", m_data["efficientnet_classification"]["status"])
        assert m_data["unet_segmentation"]["is_ready"] is True
        assert m_data["efficientnet_classification"]["is_ready"] is True
        
        # 3. Dashboard counts
        r_dash = await client.get("/api/history/dashboard")
        print(" Dashboard counts:", r_dash.status_code, "distribution:", r_dash.json()["class_distribution"])
        assert r_dash.status_code == 200
        
        # 4. Patient Creation
        r_pat = await client.post("/api/patients", json={
            "patient_name": "Test Subject A",
            "age": 45,
            "gender": "Female",
            "notes": "Initial research evaluation"
        })
        print(" Patient created:", r_pat.status_code, r_pat.json()["patient_id"])
        assert r_pat.status_code == 201
        patient_id = r_pat.json()["patient_id"]
        
        # 5. Patient List
        r_plist = await client.get("/api/patients")
        print(" Patient list count:", len(r_plist.json()))
        assert len(r_plist.json()) >= 1
        
        # 6. Test dummy image analysis
        from PIL import Image
        import io
        img = Image.new("RGB", (256, 256), color=(180, 100, 90))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        
        files = {"file": ("test_lesion.jpg", buf, "image/jpeg")}
        data = {"patient_id": patient_id, "notes": "Test analysis"}
        r_analysis = await client.post("/api/analysis/predict", files=files, data=data)
        print(" Predict analysis:", r_analysis.status_code)
        a_data = r_analysis.json()
        print("   - Predicted class:", a_data["predicted_class"])
        print("   - Confidence score:", a_data["confidence_score"], "%")
        print("   - Probabilities:", [(p["class_name"], p["percentage"]) for p in a_data["probabilities"]])
        assert r_analysis.status_code == 200
        assert "predicted_class" in a_data
        analysis_id = a_data["analysis_id"]
        
        # 7. Test PDF report generation
        r_pdf = await client.get(f"/api/reports/analysis/{analysis_id}")
        print(" PDF Report download:", r_pdf.status_code, "content length:", len(r_pdf.content), "bytes")
        assert r_pdf.status_code == 200
        assert len(r_pdf.content) > 1000
        
        # 8. Test Longitudinal Monitoring Comparison
        buf1 = io.BytesIO()
        img.save(buf1, format="JPEG")
        buf1.seek(0)
        
        img2 = Image.new("RGB", (256, 256), color=(170, 95, 85))
        buf2 = io.BytesIO()
        img2.save(buf2, format="JPEG")
        buf2.seek(0)
        
        m_files = {
            "previous_image": ("prev.jpg", buf1, "image/jpeg"),
            "current_image": ("curr.jpg", buf2, "image/jpeg")
        }
        r_mon = await client.post("/api/monitoring/compare", files=m_files, data={"patient_id": patient_id})
        print(" Monitoring compare:", r_mon.status_code)
        mon_data = r_mon.json()
        print("   - Registration method:", mon_data["registration_method"])
        print("   - Registration status:", mon_data["registration_status"])
        print("   - Comparisons count:", len(mon_data["comparison_table"]))
        assert r_mon.status_code == 200
        monitoring_id = mon_data["monitoring_id"]
        
        # 9. Test Monitoring PDF report
        r_mon_pdf = await client.get(f"/api/reports/monitoring/{monitoring_id}")
        print(" Monitoring PDF Report:", r_mon_pdf.status_code, "size:", len(r_mon_pdf.content), "bytes")
        assert r_mon_pdf.status_code == 200
        assert len(r_mon_pdf.content) > 1000
        
        print("\n ALL END-TO-END BACKEND API & ML PIPELINE TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(run_tests())
