#!/bin/bash

# Install-dependencies.sh

# acm/base.sh & labels.sh

# Update the /etc/nginx/nginx.conf file
sudo sed -i '/pid \/run\/nginx\.pid;/a\ssl_engine pkcs11;' /etc/nginx/nginx.conf
sudo sed -i '/# Settings for a TLS enabled server./{n;:a;/^#/s///;n;ba}' /etc/nginx/nginx.conf
sudo sed -i '/server_name/c\        server_name  DOMAIN_NAME_PLACEHOLDER;' /etc/nginx/nginx.conf
sudo sed -i '/ssl_certificate/d; /ssl_certificate_key/d; /ssl_ciphers/d' /etc/nginx/nginx.conf
sudo sed -i '/ssl_session_timeout/a\        ssl_protocols TLSv1.2;' /etc/nginx/nginx.conf
sudo sed -i '/# Load configuration files for the default server block./a\        include "/etc/pki/nginx/nginx-acm.conf";' /etc/nginx/nginx.conf

# openssl-conf.sh