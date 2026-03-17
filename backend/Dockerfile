# 1. Base image (Lightweight Python)
FROM python:3.11-slim

# 2. Setting the Working directory
WORKDIR /app

# 3. install the Dependencies (Caching optimized)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy all the code
COPY . .

# 5. Command to run the FASTAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]