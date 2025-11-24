FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* .npmrc* ./

RUN if [ -f pnpm-lock.yaml ]; then \
    npm install -g pnpm && pnpm install --frozen-lockfile; \
  else \
    npm install --production=false; \
  fi

COPY tsconfig.json .eslintrc.json .prettierrc ./
COPY src ./src
COPY scripts ./scripts

RUN npm run compile && node ./scripts/postbuild.ts

FROM node:20-alpine
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/public ./public
COPY package.json package-lock.json* pnpm-lock.yaml* .npmrc* ./

RUN if [ -f pnpm-lock.yaml ]; then \
    npm install -g pnpm && pnpm install --prod --frozen-lockfile; \
  else \
    npm install --production; \
  fi

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
