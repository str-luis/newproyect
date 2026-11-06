import random
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Field, Relationship, SQLModel, select
from db import create_all_tables, SessionDep

app = FastAPI(lifespan=create_all_tables)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BUCKET_VIDEOS_URL = "https://proyectvideos.s3.us-east-2.amazonaws.com"

class Videos(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    titulo: str
    source: str
    miniatura: str
    categoria: str
    es_publico: bool = True
    comments: list["Comments"] = Relationship(back_populates="video", cascade_delete=True)

class VideosCreate(SQLModel):
    titulo: str
    source: str
    miniatura: str
    categoria: str
    es_publico: bool = True

class Comments(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    autor: str
    contenido: str
    video_id: int = Field(foreign_key="videos.id")
    video: Videos | None = Relationship(back_populates="comments")

class CommentsCreate(SQLModel):
    autor: str
    contenido: str

@app.get("/videos")
def get_videos(session: SessionDep, categoria: str | None = None):
    statement = select(Videos).where(Videos.es_publico == True)
    if categoria and categoria != "Todas":
        statement = statement.where(Videos.categoria == categoria)
    return session.exec(statement).all()

@app.get("/videos/categorias")
def get_categorias(session: SessionDep):
    videos = session.exec(select(Videos).where(Videos.es_publico == True)).all()
    return sorted(list({v.categoria for v in videos if v.categoria}))

@app.get("/videos/recomendaciones/{categoria}")
def get_recommendations(categoria: str, session: SessionDep, excluir_id: int | None = None):
    statement = select(Videos).where(Videos.es_publico == True, Videos.categoria == categoria)
    if excluir_id is not None:
        statement = statement.where(Videos.id != excluir_id)
    videos_categoria = session.exec(statement).all()
    return random.sample(videos_categoria, min(len(videos_categoria), 10))

@app.get("/videos/{video_id}")
def get_video_by_id(video_id: int, session: SessionDep):
    video_db = session.get(Videos, video_id)
    if not video_db:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    return video_db

@app.get("/videos/{video_id}/comments")
def get_comments(video_id: int, session: SessionDep):
    return session.exec(select(Comments).where(Comments.video_id == video_id)).all()

@app.post("/videos/{video_id}/comments", status_code=201)
def create_comment(video_id: int, comment_data: CommentsCreate, session: SessionDep):
    comment = Comments(autor=comment_data.autor, contenido=comment_data.contenido, video_id=video_id)
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment

@app.post("/videos/seed-10")
def seed_10_videos(session: SessionDep):
    """Carga tus 10 videos reales desde tu S3 proyectvideos."""
    lista_10_videos = []
    for i in range(1, 11):
        video_obj = Videos(
            titulo=f"Video Propio #{i}",
            source=f"{BUCKET_VIDEOS_URL}/videoplayback%20({i}).webm",
            miniatura=f"{BUCKET_VIDEOS_URL}/miniatura-{i}.jpg",
            categoria="Mis Videos",
            es_publico=True
        )
        lista_10_videos.append(video_obj)

    for v in lista_10_videos:
        session.add(v)
    session.commit()
    return {"mensaje": "¡Tus 10 videos propios fueron cargados!", "total": 10}