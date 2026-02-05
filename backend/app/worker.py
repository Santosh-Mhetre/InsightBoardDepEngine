
import os

try:
    from celery import Celery

    CELERY_BROKER = os.environ.get("CELERY_BROKER_URL", "")
    if CELERY_BROKER:
        celery_app = Celery("insightboard", broker=CELERY_BROKER)
    else:
        celery_app = None
except Exception:
    # Celery not installed or failed to import — fall back to no-op celery_app
    celery_app = None


def enqueue_process(transcript_id: str, job_id: str):
    if celery_app:
        celery_app.send_task("app.worker.process_transcript_task", args=[transcript_id, job_id])
    else:
        # No-op here; FastAPI BackgroundTasks is used in main app by default
        pass


if celery_app:
    @celery_app.task(name="app.worker.process_transcript_task")
    def process_transcript_task(transcript_id: str, job_id: str):
        from .main import process_transcript

        process_transcript(transcript_id, job_id)

