from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

app = FastAPI(
    title="CDK Workshop FastAPI",
    description="Demo API for CDK Workshop",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello from FastAPI!", "deployment": "workshop"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "fastapi-workshop"}

@app.get("/info")
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

@app.post("/echo")
async def echo_data(data: dict):
    return {"echoed": data, "received_at": "fastapi-endpoint"}

# For local development
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=80)
