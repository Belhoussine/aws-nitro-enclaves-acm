sudo sed -i '/ssl_conf = ssl_module/a\engines = engine_section\n\n[engine_section]\npkcs11 = pkcs11_section\n\n[ pkcs11_section ]\nengine_id = pkcs11\ninit = 1' /etc/pki/tls/openssl.cnf
