FROM mcr.microsoft.com/playwright:v1.48.2-jammy
WORKDIR /app
RUN npm init -y >/dev/null && npm i playwright@1.48.2 >/dev/null
COPY test.mjs .
CMD ["node", "test.mjs"]
