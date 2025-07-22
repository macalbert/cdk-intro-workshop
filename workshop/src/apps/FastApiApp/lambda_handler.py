from mangum import Mangum
from main import app
import os

# Set Lambda-specific environment variables
os.environ["DEPLOYMENT_TYPE"] = "lambda"
os.environ["IMAGE_TYPE"] = "custom"
os.environ["RUNTIME_INTERFACE"] = "ric"

# Create Lambda handler using Mangum adapter
handler = Mangum(app, lifespan="off")

def lambda_handler(event, context):
    return handler(event, context)
