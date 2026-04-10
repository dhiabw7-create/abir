FROM node:22-alpine

WORKDIR /workspace

RUN apk add --no-cache libc6-compat

COPY package.json ./
COPY tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev", "-w", "@medflow/api"]
