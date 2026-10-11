from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.config import settings
from app.database import check_mongo_connection, init_db_indexes, close_mongo_client
from app.api.routes.analyze import router as analyze_router
from app.api.routes.image import router as image_router
from app.api.routes.report_word import router as report_word_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure MongoDB indexes are established
    init_db_indexes()
    yield
    # Shutdown: close MongoDB client connection cleanly
    close_mongo_client()


from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title=settings.app_name,
    description="API for detecting and moderating harmful online content.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for external websites and frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API routes
app.include_router(analyze_router)
app.include_router(image_router)
app.include_router(report_word_router)


@app.get("/")
def root():
    return {
        "success": True,
        "message": "Cyberbullying Detection & Moderation API is running"
    }


@app.get("/health")
def health_check():
    """
    Health check endpoint reporting API and MongoDB connectivity status
    without exposing credentials or connection strings.
    """
    db_health = check_mongo_connection()
    is_connected = db_health.get("connected", False)

    return {
        "success": True,
        "status": "healthy" if is_connected else "degraded",
        "database": {
            "status": "connected" if is_connected else "disconnected",
            "name": db_health.get("database", settings.mongo_db_name)
        }
    }