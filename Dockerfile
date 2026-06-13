# Stage 1: Serve the website with nginx
FROM nginx:mainline-alpine
# Copy the built application
COPY dist/selextrace-frontend/browser /usr/share/nginx/html
# Replace default nginx config with our custom one
COPY docker/default.conf /etc/nginx/conf.d/default.conf
# Install openssl for self-signed certificate generation
RUN apk add --no-cache openssl && mkdir -p /etc/nginx/ssl
# Set default environment variables
ENV BASE_HREF="/"
# Expose HTTP and HTTPS ports
EXPOSE 80 443
# Copy and enable the startup script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh
CMD ["/start.sh"]
