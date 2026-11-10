import os
import io
from datetime import datetime
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from app.config import settings

def generate_analysis_pdf(analysis_data: Dict[str, Any], patient_data: Optional[Dict[str, Any]] = None) -> bytes:
    """
    Generates an easy-to-read, patient-friendly PDF report to bring to a doctor's visit.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
        fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#0D9488'),
        fontName='Helvetica-Bold'
    )
    heading2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#1E293B'),
        fontName='Helvetica-Bold',
        spaceBefore=10,
        spaceAfter=5
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155')
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#64748B'),
        fontName='Helvetica-Oblique'
    )
    
    story = []
    
    # 1. Header Banner
    story.append(Paragraph("SkinGuard AI — Skin Spot Check Summary", title_style))
    story.append(Paragraph("PERSONAL HEALTH RECORD • PREPARED TO SHARE WITH YOUR DOCTOR OR DERMATOLOGIST", subtitle_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0D9488'), spaceBefore=2, spaceAfter=10))
    
    # 2. Metadata Table
    analysis_id = analysis_data.get("analysis_id", "N/A")
    patient_id = analysis_data.get("patient_id") or (patient_data.get("patient_id") if patient_data else "General / Personal")
    patient_name = patient_data.get("patient_name", "Myself / Personal Record") if patient_data else "Personal Record"
    created_at = analysis_data.get("created_at")
    if isinstance(created_at, datetime):
        date_str = created_at.strftime("%B %d, %Y (%H:%M)")
    else:
        date_str = str(created_at)[:10] if created_at else datetime.now().strftime("%B %d, %Y")

    meta_info = [
        [Paragraph(f"<b>Record ID:</b> {analysis_id}", body_style), Paragraph(f"<b>Date of Photo:</b> {date_str}", body_style)],
        [Paragraph(f"<b>Profile Name:</b> {patient_name}", body_style), Paragraph(f"<b>Spot Location / Notes:</b> {analysis_data.get('notes') or 'Routine spot check'}", body_style)],
    ]
    meta_table = Table(meta_info, colWidths=[260, 260])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. Assessment Banner
    story.append(Paragraph("1. AI Pattern Match Assessment", heading2_style))
    predicted_class = analysis_data.get("predicted_class", "Unknown")
    confidence_score = analysis_data.get("confidence_score", 0.0)
    
    if predicted_class == "Cancerous":
        badge_bg = colors.HexColor('#FEE2E2')
        badge_text = colors.HexColor('#991B1B')
        guidance = "<b>Medical Attention Recommended:</b> Patterns visually resemble skin cancer. Show this to a doctor promptly."
    elif predicted_class == "Precancerous / in situ":
        badge_bg = colors.HexColor('#FEF3C7')
        badge_text = colors.HexColor('#92400E')
        guidance = "<b>Early Changes Detected:</b> Patterns resemble early atypical spot changes. Recommended for routine evaluation."
    else:
        badge_bg = colors.HexColor('#DCFCE7')
        badge_text = colors.HexColor('#166534')
        guidance = "<b>Likely Benign:</b> Patterns resemble a common, safe mole or spot. Continue tracking monthly."
        
    class_summary = [
        [
            Paragraph("<b>AI Top Match:</b>", body_style),
            Paragraph(f"<font color='{badge_text}'><b>{predicted_class.upper()}</b></font>", body_style),
            Paragraph("<b>Match Confidence:</b>", body_style),
            Paragraph(f"<b>{confidence_score:.1f}%</b>", body_style)
        ]
    ]
    summary_table = Table(class_summary, colWidths=[130, 130, 130, 130])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), badge_bg),
        ('BOX', (0,0), (-1,-1), 1, badge_text),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 5))
    story.append(Paragraph(guidance, body_style))
    story.append(Spacer(1, 10))
    
    # Probability breakdown table
    probs = analysis_data.get("probabilities", [])
    prob_rows = [[Paragraph("<b>Category</b>", body_style), Paragraph("<b>Likelihood Percentage</b>", body_style), Paragraph("<b>Description for Patients</b>", body_style)]]
    explanations = {
        'Cancerous': 'Patterns matching melanoma or skin carcinoma',
        'Precancerous / in situ': 'Patterns matching early spot changes before cancer',
        'Benign': 'Patterns matching common, harmless moles and spots'
    }
    for p in probs:
        c_name = p.get("class_name", "")
        prob_rows.append([
            Paragraph(f"<b>{c_name}</b>", body_style),
            Paragraph(f"{p.get('percentage', 0.0):.1f}%", body_style),
            Paragraph(explanations.get(c_name, ""), body_style)
        ])
    prob_table = Table(prob_rows, colWidths=[150, 120, 250])
    prob_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(prob_table)
    story.append(Spacer(1, 10))

    # 4. Photos (Original, Mask, Overlay)
    story.append(Paragraph("2. Skin Spot Photos & Traced Outline", heading2_style))
    def get_img_flowable(rel_url, target_width=165):
        if not rel_url:
            return Paragraph("No Photo", body_style)
        fname = os.path.basename(rel_url)
        fpath = os.path.join(settings.UPLOAD_DIR, fname)
        if os.path.exists(fpath):
            try:
                return RLImage(fpath, width=target_width, height=target_width)
            except Exception:
                return Paragraph("Image Render Error", body_style)
        return Paragraph(f"Not Found", body_style)

    img_cells = [
        [
            Paragraph("<b>Your Uploaded Photo</b>", body_style),
            Paragraph("<b>AI Traced Silhouette</b>", body_style),
            Paragraph("<b>Highlighted Boundary</b>", body_style)
        ],
        [
            get_img_flowable(analysis_data.get("original_image_url")),
            get_img_flowable(analysis_data.get("mask_image_url")),
            get_img_flowable(analysis_data.get("overlay_image_url"))
        ]
    ]
    img_table = Table(img_cells, colWidths=[173, 173, 173])
    img_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    story.append(img_table)
    story.append(Spacer(1, 10))

    # 5. Questions for Your Doctor
    story.append(Paragraph("3. Helpful Questions to Ask Your Doctor", heading2_style))
    questions_box = [
        [Paragraph(
            "• <i>\"Doctor, does this mole show any atypical signs or irregular borders under your dermatoscope?\"</i><br/>"
            "• <i>\"Do you recommend taking a biopsy or monitoring it over the next 3 to 6 months?\"</i><br/>"
            "• <i>\"Are there other spots on my back or skin that I should keep an eye on?\"</i>",
            body_style
        )]
    ]
    q_table = Table(questions_box, colWidths=[520])
    q_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(q_table)
    story.append(Spacer(1, 10))

    # 6. Safety Disclaimer Footer
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#94A3B8'), spaceBefore=2, spaceAfter=5))
    disclaimer_text = (
        "<b>PATIENT NOTICE:</b> This document is an informational self-check summary generated by artificial intelligence. "
        "It is NOT a medical diagnosis and cannot replace an in-person physical examination by a licensed dermatologist or medical doctor. "
        "If a spot is bleeding, itching, growing, or changing, see a healthcare professional immediately."
    )
    story.append(Paragraph(disclaimer_text, disclaimer_style))
    
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

def generate_monitoring_pdf(monitoring_data: Dict[str, Any], patient_data: Optional[Dict[str, Any]] = None) -> bytes:
    """
    Generates an easy-to-read, patient-friendly PDF report comparing two visits over time.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
        fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#2563EB'),
        fontName='Helvetica-Bold'
    )
    heading2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#1E293B'),
        fontName='Helvetica-Bold',
        spaceBefore=10,
        spaceAfter=5
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155')
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#64748B'),
        fontName='Helvetica-Oblique'
    )
    
    story = []
    
    # 1. Header
    story.append(Paragraph("SkinGuard AI — Mole Change Comparison Summary", title_style))
    story.append(Paragraph("TWO-VISIT PHOTO MONITORING REPORT • SHARE WITH YOUR DOCTOR", subtitle_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563EB'), spaceBefore=2, spaceAfter=10))
    
    # 2. Metadata
    monitoring_id = monitoring_data.get("monitoring_id", "N/A")
    patient_name = patient_data.get("patient_name", "Personal Record") if patient_data else "Personal Record"
    reg_status = "Aligned Successfully" if monitoring_data.get("registration_status") == "confirmed" else "Resized for Comparison"

    meta_info = [
        [Paragraph(f"<b>Session ID:</b> {monitoring_id}", body_style), Paragraph(f"<b>Profile:</b> {patient_name}", body_style)],
        [Paragraph(f"<b>Photo Alignment:</b> {reg_status}", body_style), Paragraph(f"<b>Interval Notes:</b> {monitoring_data.get('notes') or 'Routine photo follow-up'}", body_style)]
    ]
    meta_table = Table(meta_info, colWidths=[260, 260])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. Photo Comparison
    story.append(Paragraph("1. Visual Comparison Across Visits", heading2_style))
    def get_img_flowable(rel_url, target_width=165):
        if not rel_url:
            return Paragraph("No Photo", body_style)
        fname = os.path.basename(rel_url)
        fpath = os.path.join(settings.UPLOAD_DIR, fname)
        if os.path.exists(fpath):
            try:
                return RLImage(fpath, width=target_width, height=target_width)
            except Exception:
                return Paragraph("Image Error", body_style)
        return Paragraph("Not Found", body_style)

    img_cells = [
        [
            Paragraph("<b>Earlier Photo</b>", body_style),
            Paragraph("<b>Recent Photo (Aligned)</b>", body_style),
            Paragraph("<b>Color-Coded Changes</b>", body_style)
        ],
        [
            get_img_flowable(monitoring_data.get("previous_overlay_url") or monitoring_data.get("previous_image_url")),
            get_img_flowable(monitoring_data.get("current_overlay_url") or monitoring_data.get("aligned_current_url")),
            get_img_flowable(monitoring_data.get("difference_mask_url"))
        ]
    ]
    img_t = Table(img_cells, colWidths=[173, 173, 173])
    img_t.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(img_t)
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        "<b>Change Map Key:</b> Yellow = Unchanged spot area | Red = New or expanded spot area | Blue = Area reduced or faded",
        ParagraphStyle('Legend', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#475569'))
    ))
    story.append(Spacer(1, 10))

    # 4. Measurement Differences
    story.append(Paragraph("2. Spot Measurements & Percentage Changes", heading2_style))
    comp_table = monitoring_data.get("comparison_table", [])
    
    table_rows = [
        [
            Paragraph("<b>Measurement</b>", body_style),
            Paragraph("<b>Earlier Photo</b>", body_style),
            Paragraph("<b>Recent Photo</b>", body_style),
            Paragraph("<b>Change (%)</b>", body_style),
            Paragraph("<b>Status</b>", body_style)
        ]
    ]
    friendly_labels = {
        'Lesion Area (px)': 'Overall Size (Area)',
        'Perimeter (px)': 'Outer Border Length',
        'Bounding Box Width (px)': 'Horizontal Width',
        'Bounding Box Height (px)': 'Vertical Height',
        'Circularity Index': 'Border Roundness'
    }
    for row in comp_table:
        pct = row.get("percentage_change")
        pct_str = f"{pct:+.1f}%" if pct is not None else "N/A"
        pct_color = "#DC2626" if pct and abs(pct) > 15 else "#16A34A" if pct and abs(pct) <= 5 else "#D97706"
        status_text = "Stable" if pct and abs(pct) <= 5 else "Expanded" if pct and pct > 0 else "Reduced" if pct else "N/A"
        table_rows.append([
            Paragraph(friendly_labels.get(row.get("metric"), str(row.get("metric"))), body_style),
            Paragraph(str(row.get("previous_value", "N/A")), body_style),
            Paragraph(str(row.get("current_value", "N/A")), body_style),
            Paragraph(f"<font color='{pct_color}'><b>{pct_str}</b></font>", body_style),
            Paragraph(status_text, body_style)
        ])
        
    t_comp = Table(table_rows, colWidths=[150, 95, 95, 95, 85])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_comp)
    story.append(Spacer(1, 10))

    # 5. Disclaimer
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#94A3B8'), spaceBefore=2, spaceAfter=5))
    story.append(Paragraph(
        "<b>NOTE:</b> Pixel measurements are calculated from digital photos and can vary slightly with distance and camera angles. "
        "This tool is for personal tracking. Any mole that is visibly growing, changing, or causing concern should be examined by a doctor.",
        disclaimer_style
    ))
    
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
