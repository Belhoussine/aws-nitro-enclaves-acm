sudo tee -a /etc/nitro_enclaves/acm.yaml > /dev/null << 'EOF'
  - label: nginx-acm-token-INDEX_PLACEHOLDER
    source:
      Acm:
        certificate_arn: "CERTIFICATE_ARN_PLACEHOLDER"
    target:
      NginxStanza:
        path: /etc/pki/nginx/nginx-acm-INDEX_PLACEHOLDER.conf
        user: nginx
    refresh_interval_secs: 43200
EOF
