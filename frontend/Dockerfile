FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install -g serve
RUN npm install

# Fix Vite build error: terser missing
RUN npm install -D terser

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["serve", "-s", "dist", "-l", "5000"]