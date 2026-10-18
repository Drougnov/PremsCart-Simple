# Build the React frontend and copy it into the ASP.NET Core app.
FROM node:24-alpine AS frontend-build
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci --no-audit --no-fund
COPY frontend/ ./frontend/
COPY backend/wwwroot/ ./backend/wwwroot/
RUN cd frontend && npm run build

# Publish the ASP.NET Core 10 backend with the new React static files.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dotnet-build
WORKDIR /src
COPY backend/ ./backend/
COPY --from=frontend-build /src/backend/wwwroot/ ./backend/wwwroot/
RUN test ! -d backend/backend && test ! -d backend/checks || (echo "Nested project detected: replace backend instead of merging folders" && exit 1)
RUN dotnet restore ./backend/PremsCart.csproj
RUN dotnet publish ./backend/PremsCart.csproj -c Release --no-restore -o /publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=dotnet-build /publish/ ./
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000
ENTRYPOINT ["dotnet", "PremsCart.dll"]
