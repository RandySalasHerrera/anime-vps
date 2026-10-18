Prueba del VPS (Ubuntu sin interfaz gráfica)

1) Copia esta carpeta al VPS, por ejemplo:
   scp -r vps-test usuario@IP_DEL_VPS:~

2) En el VPS (si no tienes Docker:  curl -fsSL https://get.docker.com | sh):
   cd ~/vps-test
   sudo docker build -t vps-test .
   sudo docker run --rm --ipc=host vps-test

3) Mándame la salida completa.
