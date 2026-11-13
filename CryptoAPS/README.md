# CryptoAPS

Aplicação local para demonstrar criptografia e descriptografia de mensagens com AES-256-GCM, derivação de chave PBKDF2-SHA-256 e Web Crypto API.

## Como iniciar

Com Node.js instalado, abra um terminal nesta pasta e execute `node server.js`. Acesse `http://localhost:4173` no navegador. O servidor serve apenas os arquivos desta aplicação em loopback e não tem endpoints para receber mensagens ou chaves. Também é possível abrir `index.html` diretamente se o navegador permitir módulos JavaScript em `file://`.

## Uso

Digite uma mensagem de até 128 caracteres e informe uma chave, ou gere uma chave aleatória. Clique em **Criptografar mensagem** e guarde o texto `CAPS1:...` gerado junto da chave. Para recuperar a mensagem, cole o pacote e use a mesma chave na seção **Descriptografar**.

O texto cifrado contém versão, algoritmo, contagem de iterações, salt aleatório de 16 bytes, IV aleatório de 12 bytes e dados cifrados com tag GCM de 128 bits. Cada operação gera salt e IV criptograficamente aleatórios. A frase informada é derivada em uma chave AES de 256 bits com PBKDF2-SHA-256 e 310.000 iterações. O formato é versionado; não edite manualmente o pacote.

## Privacidade

Todo o processamento criptográfico acontece no navegador. A aplicação não usa servidor de API, armazenamento local, cookies ou transmissão de dados. A lista de histórico permanece apenas em memória durante a sessão e é apagada ao atualizar ou fechar a página; ela não inclui chaves. Não compartilhe a chave junto do pacote cifrado.
