sudo sed -i '/# Load configuration files for the default server block./a\        include "/etc/pki/nginx/nginx-acm-INDEX_PLACEHOLDER.conf";' /etc/nginx/nginx.conf
