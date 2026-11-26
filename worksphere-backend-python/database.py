import os
import ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

RAW_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:WorkSphere%40123@localhost:3306/worksphere_db"
)

# Normalize mysql:// -> mysql+pymysql:// and extract SSL mode for PyMySQL
if RAW_DATABASE_URL.startswith("mysql://"):
    RAW_DATABASE_URL = "mysql+pymysql://" + RAW_DATABASE_URL[len("mysql://"):]

parsed = urlparse(RAW_DATABASE_URL)
query_params = parse_qs(parsed.query)
ssl_mode = query_params.pop("ssl-mode", [None])[0] or query_params.pop("ssl_mode", [None])[0]
clean_query = urlencode(query_params, doseq=True)
DATABASE_URL = urlunparse(parsed._replace(query=clean_query))

connect_args = {}
if ssl_mode and ssl_mode.upper() != "DISABLED":
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ctx

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=3600
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
