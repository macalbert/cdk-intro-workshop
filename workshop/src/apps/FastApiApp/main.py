from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os

# Response models for better Swagger documentation
class MessageResponse(BaseModel):
    message: str
    deployment: str

class HealthResponse(BaseModel):
    status: str
    service: str

class EchoResponse(BaseModel):
    echoed: dict
    received_at: str

app = FastAPI(
    title="CDK Workshop FastAPI",
    description="Demo API for CDK Workshop - A comprehensive API showcasing different deployment strategies",
    version="1.0.0",
    docs_url="/swagger",  # Swagger UI endpoint
    redoc_url="/redoc"  # ReDoc endpoint
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_model=MessageResponse, summary="Root endpoint", description="Returns a welcome message")
async def root():
    return {"message": "Hello from FastAPI!", "deployment": "workshop"}

@app.get("/health", response_model=HealthResponse, summary="Health check", description="Returns the health status of the service")
async def health_check():
    return {"status": "healthy", "service": "fastapi-workshop"}

@app.get("/info", summary="Service information", description="Returns detailed information about the service and deployment")
async def get_info():
    return {
        "runtime": "FastAPI",
        "python_version": "3.9+",
        "deployment_type": os.getenv("DEPLOYMENT_TYPE", "unknown"),
        "container_info": {
            "image_type": os.getenv("IMAGE_TYPE", "custom"),
            "runtime_interface": os.getenv("RUNTIME_INTERFACE", "direct")
        }
    }

@app.post("/echo", response_model=EchoResponse, summary="Echo data", description="Echoes back the provided JSON data")
async def echo_data(data: dict):
    return {"echoed": data, "received_at": "fastapi-endpoint"}

# For local development
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=80)
