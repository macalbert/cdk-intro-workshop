# Use AWS Lambda Python base image without RIC
FROM public.ecr.aws/lambda/python:3.9

EXPOSE 8000

# Set environment variables for Lambda
ENV PYTHONPATH=${LAMBDA_TASK_ROOT}
ENV DEPLOYMENT_TYPE=lambda
ENV IMAGE_TYPE=public.ecr.aws/lambda/python:3.9
ENV RUNTIME_INTERFACE=direct

# Copy requirements and install dependencies
COPY workshop/src/apps/FastApiApp/requirements.txt ${LAMBDA_TASK_ROOT}
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY workshop/src/apps/FastApiApp ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler
CMD ["lambda_handler.lambda_handler"]
