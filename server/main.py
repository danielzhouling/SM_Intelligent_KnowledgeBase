from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.database import async_session, init_db
from server.seed import seed_initial_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    async with async_session() as session:
        await seed_initial_data(session)
    yield
    # Shutdown (engine cleanup handled by app scope)


app = FastAPI(
    title="SM-Dmall Knowledge Base API",
    description="智能知识库系统后端服务",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from server.routers.auth import router as auth_router  # noqa: E402
from server.routers.feishu import router as feishu_router  # noqa: E402
from server.routers.users import router as users_router  # noqa: E402
from server.routers.roles import router as roles_router  # noqa: E402
from server.routers.bots import router as bots_router  # noqa: E402
from server.routers.feedbacks import router as feedbacks_router  # noqa: E402
from server.routers.chat import router as chat_router  # noqa: E402

app.include_router(auth_router)
app.include_router(feishu_router)
app.include_router(users_router)
app.include_router(roles_router)
app.include_router(bots_router)
app.include_router(feedbacks_router)
app.include_router(chat_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "SM-Dmall Knowledge Base API", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
