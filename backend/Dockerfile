FROM python:3.11-slim
WORKDIR /app
# Use repo-relative paths so Render's build context (root of repo) works reliably
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
ENV PYTHONPATH=/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

