# Kaveriel para Mac — cliente web em aplicativo

Decisão de 02/10/2026: usar Electron somente no Mac enquanto o backend gráfico do OTClient macOS fica adiado. Windows e Linux continuam usando `native/`. Este diretório foi recuperado da revisão `1200274`; o candidato Mac tem versão **1.2.0**, distinta da distribuição nativa 1.1.0.

## Estado

Publicação experimental autorizada em 02/10/2026. Os downloads dependem dos ZIPs reais, hashes e resultados do workflow; esta revisão local ainda não comprova execução em Mac físico. M3/Tahoe, Intel e gameplay continuam como validações pendentes, sem promessa de compatibilidade testada com macOS 15/26. A versão do jogo continua vindo de `https://kaveriel.com.br/play`; o instalador não contém os assets do jogo. O primeiro acesso precisa baixar os arquivos web; as visitas seguintes podem reutilizar os pacotes íntegros que não mudaram.

O app não precisa de XQuartz, não contém o controlador do Aren/residentes e usa o cliente web público em uma janela própria. Não é o OTClient C++ nativo. No primeiro acesso há download dos arquivos web; posteriormente o perfil persistente do Electron pode reutilizar caches. Não compartilha automaticamente cookies, hotkeys ou cache com o Chrome do jogador.

## Compilar e testar no Mac

Na branch `dudantas/mac-web-player`, usando Node compatível com o lockfile:

```sh
cd desktop
npm ci --no-audit --no-fund
npm test
npm run dist:mac
KAVERIEL_BUILD_ARCH=arm64 node tools/verify-package.cjs
codesign --verify --deep --strict dist/mac-arm64/Kaveriel.app
KAVERIEL_BUILD_ARCH=arm64 node tools/smoke.cjs
```

Repita a verificação do pacote x64 com `KAVERIEL_BUILD_ARCH=x64`; seu app fica em `dist/mac/Kaveriel.app`. O smoke x64 no M3 usa Rosetta, não comprova hardware Intel. Os ZIPs são `Kaveriel-1.2.0-mac-web-{arm64,x64}.zip`. Verifique assinatura também após extrair cada ZIP em pasta nova.

O workflow `player-desktop.yml` agora gera apenas Mac, sem upload automático para uma release. Ele abre a tela de login do cliente público no smoke; não faz login com conta nem comprova combate ou desempenho prolongado. A publicação experimental foi autorizada com a validação física pendente: abertura normal no Finder, GPU, login manual, movimento, duas telas, hotkeys, minimizar/reabrir e áudio com consentimento no M3/Tahoe e em Intel. Registrar separadamente os sistemas realmente testados. Testes com conta devem ser operados pelo usuário, sem credenciais em logs ou no repositório.

## Proteções e atualizações

Sandbox, contextIsolation e webSecurity ligados; Node, webview e preload privilegiado ausentes no renderer. A rede da página está restrita a HTTPS/WSS de `kaveriel.com.br`. Somente downloads oficiais podem abrir no navegador externo. A allowlist precisará de revisão explícita se assets forem movidos para outro domínio/CDN; não liberar origens genéricas para resolver isso.

O aplicativo permite `persistent-storage` somente à página principal dessa origem na própria janela. Essa permissão reduz a remoção de dados por pressão de armazenamento, conforme a [API de sessão do Electron](https://www.electronjs.org/docs/latest/api/session); não cria backup nem impede uma limpeza manual. Ao confirmar fechar, aguarda até 5 segundos pelo commit das preferências já escritas. Se a gravação falhar ou exceder esse limite, oferece continuar jogando (padrão) ou fechar sem guardar as alterações recentes. Um site anterior sem a API de flush continua podendo fechar. Isso não grava a exploração nova do minimapa mantida em memória: use Deslogar dentro do jogo para salvá-la.

Assinatura ad-hoc continua distinta de Developer ID/notarização: restaurar Electron não elimina automaticamente avisos do Gatekeeper. As proteções e fuses originais foram preservados. O conteúdo web acompanha o site, mas **o binário Electron não possui auto-updater** nesta entrega; atualizações do Chromium/Electron exigem novo pacote do app. Não confundir os dois mecanismos e manter a versão do Electron acompanhada.

## Catálogo misto

`site/downloads.json` preserva integralmente os arquivos Windows/Linux 1.1.0. Com a publicação experimental autorizada, acrescentar os dois artefatos Mac após os checks do workflow, com `version: "1.2.0"`, URL exata da release v1.2.0 e bytes/SHA-256 reais. O validador suporta versão por arquivo sem aceitar outras origens. Não reaproveitar os hashes/ZIPs do antigo Mac nativo nem recriar v1.0.0 como se fosse esta entrega.

Ao publicar, atualizar os textos temporários “em preparação” da home/FAQ/cartão com os requisitos medidos, além do README e release notes do repositório de downloads. A promoção deve passar por PR; nada deste preparo modifica main, VM ou downloads atuais.

Diagnóstico preservado e plano futuro: [macOS e carregamento web](../docs/macos-e-carregamento-web.md).
