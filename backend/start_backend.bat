@echo off
echo ===================================================
echo Starting UK Police Analytics Library Backend...
echo ===================================================
echo Installing/Upgrading requirements...
pip install -r requirements.txt

echo.
echo Starting FastAPI server...
echo The API will be available at http://localhost:8000
echo The Swagger UI will be available at http://localhost:8000/docs
echo.
echo Press CTRL+C to stop the server.
echo ===================================================
uvicorn main:app --reload --host 0.0.0.0 --port 8000
