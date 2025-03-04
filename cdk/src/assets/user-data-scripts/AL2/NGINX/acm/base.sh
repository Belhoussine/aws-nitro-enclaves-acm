sudo tee -a /etc/nitro_enclaves/acm.yaml > /dev/null << 'EOF'
# Copyright 2020-2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
---
# ACM for Nitro Enclaves config.
#
# This is an example of setting up ACM, with Nitro Enclaves and nginx.
# You can take this file and then:
# - copy it to /etc/nitro_enclaves/acm.yaml;
# - fill in your ACM certificate ARN in the `certificate_arn` field below;
# - make sure /etc/nginx/nginx.conf is set up to:
#   - use the pkcs11 SSL engine, and;
#   - include the stanza file configured below (under `NginxStanza`)
#     somewhere in the nginx.conf `server` section;
# - start the nitro-enclaves-acm service.
#
# Enclave general configuration
enclave:
  # Number of vCPUs to be assigned to the enclave
  cpu_count: 2
  # Memory (in MiB) to be assigned to the enclave
  memory_mib: 256

# General options
options:
  # If NGINX is not running, force restart it
  nginx_force_start: true

  # The NGINX reload timeout period (milliseconds)
  nginx_reload_wait_ms: 1000

  # Certificate renewal check period (seconds)
  sync_interval_secs: 600
EOF
