-- Cursos / Fotocheck / EMO pueden llevar su foto o PDF adjunto.
ALTER TABLE "cursos" ADD COLUMN     "archivo_nombre" TEXT,
ADD COLUMN     "archivo_url" TEXT;
