FROM node:22-alpine

WORKDIR /workspace

COPY package.json ./
COPY tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "-w", "@medflow/web", "--", "--host", "0.0.0.0"]
