import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from app.models.schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from app.utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user
)
from app.database import db_find_user_by_email, db_create_user, db_find_user_by_id

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister):
    existing = await db_find_user_by_email(user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
        
    user_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
    hashed_pwd = get_password_hash(user_in.password)
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "user_id": user_id,
        "name": user_in.name,
        "email": user_in.email.lower(),
        "password_hash": hashed_pwd,
        "role": user_in.role or "researcher",
        "created_at": now
    }
    
    await db_create_user(user_doc)
    
    token = create_access_token({"sub": user_id, "email": user_doc["email"], "name": user_doc["name"], "role": user_doc["role"]})
    
    user_resp = UserResponse(
        user_id=user_id,
        name=user_doc["name"],
        email=user_doc["email"],
        role=user_doc["role"],
        created_at=now
    )
    return TokenResponse(access_token=token, token_type="bearer", user=user_resp)

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db_find_user_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
        
    token = create_access_token({
        "sub": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "researcher")
    })
    
    user_resp = UserResponse(
        user_id=user["user_id"],
        name=user["name"],
        email=user["email"],
        role=user.get("role", "researcher"),
        created_at=user.get("created_at", datetime.now(timezone.utc))
    )
    return TokenResponse(access_token=token, token_type="bearer", user=user_resp)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db_find_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserResponse(
        user_id=user["user_id"],
        name=user["name"],
        email=user["email"],
        role=user.get("role", "researcher"),
        created_at=user.get("created_at", datetime.now(timezone.utc))
    )

