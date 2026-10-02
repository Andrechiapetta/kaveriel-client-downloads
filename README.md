# Kaveriel — clientes do jogador

Downloads gratuitos em **https://kaveriel.com.br/downloads**.

- **Windows e Linux:** OTClient nativo 1.1.0. Instaladores completos e atualização dos arquivos do jogo por assinatura Ed25519 e SHA-256.
- **macOS:** app 1.2.0 baseado no cliente web em Electron, para Apple silicon e Intel. Não precisa do XQuartz. Extraia o ZIP e arraste Kaveriel para Aplicativos. A primeira abertura baixa os arquivos do jogo; o cache permite reutilizá-los nas próximas aberturas.
- **Navegador:** continua disponível em https://kaveriel.com.br/play, com a mesma conta e mundo.

Windows x64: execute o instalador por usuário, sem administrador. Linux x64: pacote .deb para Ubuntu 22.04+/Debian 12+ ou pasta portátil; requer glibc 2.35, GLEW 2.2 e OpenGL/X11/XWayland.

O app Mac tem assinatura ad-hoc, sem Developer ID/notarização. Windows também não possui certificado de editor. Confira origem e SHA-256 antes de abrir. No Mac, siga a [aprovação individual indicada pela Apple](https://support.apple.com/pt-br/102445) se necessário; mantenha as proteções do sistema ativas. Não há garantia de abertura em todo Mac: build e teste de inicialização no CI não substituem gameplay em máquina física.

Hotkeys e preferências ficam no perfil local de cada aplicativo ou navegador, separados das atualizações. O minimapa é salvo ao deslogar pelo jogo. Esses dados não são sincronizados entre computadores. Voz está disponível no navegador e no app Mac; ainda não no nativo Windows/Linux.

O conteúdo web é atualizado ao abrir, reutilizando os pacotes inalterados. Atualizar o próprio executável Electron exige baixar uma nova versão do app. Isso não promete redução de ping ou aumento de FPS. Os downloads ficam no GitHub, fora da VM do jogo.

Os pacotes são apenas do jogador: não incluem Aren, residentes, radar privado, credenciais ou chaves administrativas. O fonte do app Mac está em `desktop/`; detalhes e testes em [desktop/README.md](desktop/README.md). O fonte do OTClient nativo e suas licenças acompanham a release 1.1.0.

O pacote nativo Mac 1.1.0 com XQuartz permanece apenas como histórico: apresentou falha gráfica no M3/macOS Tahoe, sem comprovação de compatibilidade nos demais Macs. Prefira os novos arquivos mac-web ou o navegador.
