import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routers import cases, evidence

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FORGE-VISION Forensic Backend",
    description="Offline surveillance video evidence analysis & preservation platform API",
    version="1.0.0"
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases.router)
app.include_router(evidence.router)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.get("/")
def health_check():
    return {
        "status": "online",
        "system": "FORGE-VISION Forensic Engine",
        "version": "1.0.0"
    }
