FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       tesseract-ocr \
       tesseract-ocr-spa \
       libgl1 \
       libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY run.py ./

ENV HOST=0.0.0.0
ENV RELOAD=false
ENV OCR_TESSERACT_CMD=tesseract
ENV OCR_TESSDATA_DIR=/usr/share/tesseract-ocr/5/tessdata

EXPOSE 8010
CMD ["python", "run.py"]