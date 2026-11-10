import os
import io
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
import pymongo
from app.config import settings

logger = logging.getLogger("database")

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db = None
    fs: Optional[AsyncIOMotorGridFSBucket] = None
    is_connected: bool = False
    
    # In-memory storage fallback if MongoDB Atlas is not yet configured or reachable
    _memory_users: Dict[str, Dict[str, Any]] = {}
    _memory_patients: Dict[str, Dict[str, Any]] = {}
    _memory_analyses: Dict[str, Dict[str, Any]] = {}
    _memory_monitoring: Dict[str, Dict[str, Any]] = {}
    _memory_metadata: Dict[str, Dict[str, Any]] = {}

db = Database()

async def connect_to_database():
    try:
        # If connecting to localhost, do a quick non-blocking socket check first
        if not settings.MONGODB_URI or "localhost" in settings.MONGODB_URI or "127.0.0.1" in settings.MONGODB_URI:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.3)
            res = sock.connect_ex(("127.0.0.1", 27017))
            sock.close()
            if res != 0:
                raise ConnectionError("Local MongoDB service not running on 127.0.0.1:27017")

        masked_uri = settings.MONGODB_URI.split('@')[-1] if '@' in settings.MONGODB_URI else 'localhost'
        logger.info(f"Connecting to MongoDB Atlas at: {masked_uri}")
        
        motor_kwargs = {
            "serverSelectionTimeoutMS": 60000,
            "connectTimeoutMS": 60000,
        }
        try:
            import certifi
            motor_kwargs["tlsCAFile"] = certifi.where()
        except ImportError:
            pass

        db.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            **motor_kwargs
        )
        import asyncio
        await asyncio.wait_for(db.client.admin.command('ping'), timeout=60.0)
        db.db = db.client[settings.DATABASE_NAME]
        db.fs = AsyncIOMotorGridFSBucket(db.db)
        db.is_connected = True
        logger.info("MongoDB Atlas connected successfully.")
        
        # Create indexes
        await create_indexes()
    except Exception as e:
        db.is_connected = False
        logger.info(
            f"MongoDB connection notice ({str(e)}). "
            "Using in-memory persistent fallback store for development/testing. "
            "Set MONGODB_URI in backend/.env to connect to your live MongoDB Atlas cluster."
        )

async def close_database_connection():
    if db.client:
        db.client.close()
        db.is_connected = False
        logger.info("MongoDB connection closed.")

async def create_indexes():
    if not db.is_connected or db.db is None:
        return
    try:
        # Users
        await db.db.users.create_index("email", unique=True)
        await db.db.users.create_index("user_id", unique=True)

        # Patients
        await db.db.patients.create_index("patient_id", unique=True)
        await db.db.patients.create_index("user_id")
        await db.db.patients.create_index("created_at")

        # Analyses
        await db.db.analyses.create_index("analysis_id", unique=True)
        await db.db.analyses.create_index("patient_id")
        await db.db.analyses.create_index("created_at")

        # Monitoring sessions
        await db.db.monitoring_sessions.create_index("monitoring_id", unique=True)
        await db.db.monitoring_sessions.create_index("patient_id")
        await db.db.monitoring_sessions.create_index("created_at")

        logger.info("MongoDB indexes verified.")
    except Exception as e:
        logger.warning(f"Error creating indexes: {e}")

def _clean_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return doc
    clean = dict(doc)
    clean.pop("_id", None)
    return clean

def _clean_docs(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [_clean_doc(d) for d in docs if d is not None]

# ----------------- Database helper operations -----------------

async def save_image_to_gridfs(filename: str, content: bytes, content_type: str = "image/jpeg") -> str:
    """
    Saves image into GridFS if connected, and always writes to local upload directory.
    Returns reference string / filename.
    """
    # 1. Local disk save
    local_path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(local_path, "wb") as f:
        f.write(content)
        
    # 2. GridFS save if Atlas is connected
    if db.is_connected and db.fs:
        try:
            grid_in = db.fs.open_upload_stream(
                filename,
                metadata={"contentType": content_type, "uploaded_at": datetime.now(timezone.utc)}
            )
            await grid_in.write(content)
            await grid_in.close()
            logger.info(f"Saved {filename} to GridFS with ID: {grid_in._id}")
        except Exception as e:
            logger.warning(f"Failed to save image to GridFS: {e}")
            
    return filename

# --- Users ---
async def db_find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    if db.is_connected and db.db is not None:
        return _clean_doc(await db.db.users.find_one({"email": email}))
    for u in db._memory_users.values():
        if u["email"].lower() == email.lower():
            return u
    return None

async def db_find_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    if db.is_connected and db.db is not None:
        return _clean_doc(await db.db.users.find_one({"user_id": user_id}))
    return db._memory_users.get(user_id)

async def db_create_user(user_doc: Dict[str, Any]) -> Dict[str, Any]:
    if db.is_connected and db.db is not None:
        await db.db.users.insert_one(user_doc)
        return _clean_doc(user_doc)
    else:
        db._memory_users[user_doc["user_id"]] = user_doc
    return user_doc

# --- Patients ---
async def db_find_patient(patient_id: str) -> Optional[Dict[str, Any]]:
    if db.is_connected and db.db is not None:
        return _clean_doc(await db.db.patients.find_one({"patient_id": patient_id}))
    return db._memory_patients.get(patient_id)

async def db_list_patients(user_id: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {}
    if user_id:
        query["user_id"] = user_id
    if search:
        query["$or"] = [
            {"patient_id": {"$regex": search, "$options": "i"}},
            {"patient_name": {"$regex": search, "$options": "i"}}
        ]
        
    if db.is_connected and db.db is not None:
        cursor = db.db.patients.find(query).sort("updated_at", pymongo.DESCENDING)
        raw_list = await cursor.to_list(length=500)
        return _clean_docs(raw_list)
    
    results = []
    for p in db._memory_patients.values():
        if user_id and p.get("user_id") != user_id:
            continue
        if search:
            s = search.lower()
            if s not in p.get("patient_id", "").lower() and s not in p.get("patient_name", "").lower():
                continue
        results.append(p)
    results.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return results

async def db_create_patient(patient_doc: Dict[str, Any]) -> Dict[str, Any]:
    if db.is_connected and db.db is not None:
        await db.db.patients.insert_one(patient_doc)
        return _clean_doc(patient_doc)
    else:
        db._memory_patients[patient_doc["patient_id"]] = patient_doc
    return patient_doc

async def db_update_patient(patient_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    updates["updated_at"] = datetime.now(timezone.utc)
    if db.is_connected and db.db is not None:
        await db.db.patients.update_one({"patient_id": patient_id}, {"$set": updates})
        return _clean_doc(await db.db.patients.find_one({"patient_id": patient_id}))
    if patient_id in db._memory_patients:
        db._memory_patients[patient_id].update(updates)
        return db._memory_patients[patient_id]
    return None

async def db_delete_patient(patient_id: str) -> bool:
    if db.is_connected and db.db is not None:
        res = await db.db.patients.delete_one({"patient_id": patient_id})
        await db.db.analyses.delete_many({"patient_id": patient_id})
        await db.db.monitoring_sessions.delete_many({"patient_id": patient_id})
        return res.deleted_count > 0
    if patient_id in db._memory_patients:
        del db._memory_patients[patient_id]
        # Also clean up analyses and monitoring
        for aid, a in list(db._memory_analyses.items()):
            if a.get("patient_id") == patient_id:
                del db._memory_analyses[aid]
        for mid, m in list(db._memory_monitoring.items()):
            if m.get("patient_id") == patient_id:
                del db._memory_monitoring[mid]
        return True
    return False

# --- Analyses ---
async def db_create_analysis(analysis_doc: Dict[str, Any]) -> Dict[str, Any]:
    if db.is_connected and db.db is not None:
        await db.db.analyses.insert_one(analysis_doc)
        return _clean_doc(analysis_doc)
    else:
        db._memory_analyses[analysis_doc["analysis_id"]] = analysis_doc
    return analysis_doc

async def db_find_analysis(analysis_id: str) -> Optional[Dict[str, Any]]:
    if db.is_connected and db.db is not None:
        return _clean_doc(await db.db.analyses.find_one({"analysis_id": analysis_id}))
    return db._memory_analyses.get(analysis_id)

async def db_list_analyses(patient_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    if db.is_connected and db.db is not None:
        cursor = db.db.analyses.find(query).sort("created_at", pymongo.DESCENDING).limit(limit)
        raw_list = await cursor.to_list(length=limit)
        return _clean_docs(raw_list)
    res = [a for a in db._memory_analyses.values() if not patient_id or a.get("patient_id") == patient_id]
    res.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return res[:limit]

# --- Monitoring Sessions ---
async def db_create_monitoring_session(doc: Dict[str, Any]) -> Dict[str, Any]:
    if db.is_connected and db.db is not None:
        await db.db.monitoring_sessions.insert_one(doc)
        return _clean_doc(doc)
    else:
        db._memory_monitoring[doc["monitoring_id"]] = doc
    return doc

async def db_find_monitoring_session(monitoring_id: str) -> Optional[Dict[str, Any]]:
    if db.is_connected and db.db is not None:
        return _clean_doc(await db.db.monitoring_sessions.find_one({"monitoring_id": monitoring_id}))
    return db._memory_monitoring.get(monitoring_id)

async def db_list_monitoring_sessions(patient_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    if db.is_connected and db.db is not None:
        cursor = db.db.monitoring_sessions.find(query).sort("created_at", pymongo.DESCENDING).limit(limit)
        raw_list = await cursor.to_list(length=limit)
        return _clean_docs(raw_list)
    res = [m for m in db._memory_monitoring.values() if not patient_id or m.get("patient_id") == patient_id]
    res.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return res[:limit]

# --- Counts & Stats ---
async def db_get_dashboard_counts():
    if db.is_connected and db.db is not None:
        total_p = await db.db.patients.count_documents({})
        total_a = await db.db.analyses.count_documents({})
        total_m = await db.db.monitoring_sessions.count_documents({})
        # Class distribution
        pipeline = [
            {"$group": {"_id": "$predicted_class", "count": {"$sum": 1}}}
        ]
        dist_cursor = db.db.analyses.aggregate(pipeline)
        dist = {item["_id"]: item["count"] for item in await dist_cursor.to_list(length=10)}
    else:
        total_p = len(db._memory_patients)
        total_a = len(db._memory_analyses)
        total_m = len(db._memory_monitoring)
        dist = {}
        for a in db._memory_analyses.values():
            c = a.get("predicted_class", "Unknown")
            dist[c] = dist.get(c, 0) + 1
            
    # Guarantee the three classes exist in distribution
    distribution = {
        "Cancerous": dist.get("Cancerous", 0),
        "Precancerous / in situ": dist.get("Precancerous / in situ", 0),
        "Benign": dist.get("Benign", 0)
    }
    return total_p, total_a, total_m, distribution
