# Portal de Estudos

Portal responsivo para organizar aulas, atividades, vídeos, links e arquivos em um só lugar. O site é estático (GitHub Pages) e usa o Supabase para guardar os conteúdos, autenticar o administrador e armazenar anexos.

## O que já está pronto

- Interface adaptável a desktop, tablet e celular.
- Tema claro/escuro.
- Listagem separada de aulas e atividades, com busca e ordenação.
- Conteúdo com texto, instruções, vídeo do YouTube, links e vários arquivos.
- Área administrativa com login, criação, edição, publicação e exclusão.
- Materiais guardados no Supabase Storage, compartilhados com todos os visitantes.
- Deploy automático pelo GitHub Actions a cada push na branch `main`.

## Configuração única (necessária para colocar o portal no ar)

### 1. Criar o projeto Supabase

1. Acesse [supabase.com](https://supabase.com/) e crie um projeto.
2. Espere o banco terminar de inicializar.
3. No projeto, abra **SQL Editor → New query**.
4. Copie todo o conteúdo de [supabase-schema.sql](./supabase-schema.sql), cole no editor e clique em **Run**.

Isso cria as tabelas, as regras de acesso (RLS) e o bucket público de arquivos. Visitantes podem ler apenas conteúdos publicados. Apenas o usuário cadastrado como administrador pode criar, alterar ou excluir conteúdos e enviar arquivos.

### 2. Criar o usuário administrador

1. No Supabase, abra **Authentication → Users → Add user**.
2. Cadastre seu e-mail e uma senha forte. Confirme/crie o usuário pelo painel.
3. Copie o **User UID** desse usuário.
4. Volte ao **SQL Editor** e execute, trocando o UUID de exemplo pelo seu:

```sql
insert into public.portal_admins (user_id)
values ('COLE-SEU-USER-UID-AQUI');
```

Não compartilhe a senha. Não é necessário criar conta para quem só vai consultar o portal.

### 3. Conectar o site ao Supabase

1. No Supabase, abra **Project Settings → API** (ou **Data API**, conforme a versão do painel).
2. Copie a **Project URL** e a chave pública **anon / publishable**.
3. Abra o arquivo [config.js](./config.js) neste repositório e clique no lápis para editar.
4. Substitua os dois valores de exemplo pelos dados do seu projeto e salve com **Commit changes**.

A chave anon/publishable é própria para uso no navegador e está protegida pelas políticas RLS deste projeto. **Nunca coloque a chave `service_role` ou qualquer segredo nesse arquivo.**

### 4. Ativar o GitHub Pages

1. No GitHub, abra **Settings → Pages** do repositório.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Abra a aba **Actions** e confira a execução **Deploy portal to GitHub Pages**. O workflow também roda automaticamente quando houver atualização na branch `main`.
4. Quando a execução terminar, o GitHub mostrará o endereço do site na página **Settings → Pages**.

## Como usar

- Acesse o endereço publicado. Visitantes não precisam fazer login.
- Para administrar, clique em **Área do administrador** no rodapé da barra lateral e entre com o usuário criado no Supabase.
- Use **Nova aula** ou **Nova atividade** para adicionar conteúdo.
- Em links externos, use uma URL por linha. Opcionalmente, escreva `Título | https://...`.
- Arquivos anexados são enviados ao bucket compartilhado do Supabase. O limite configurado é de 50 MB por arquivo.
- Desmarque **Publicar este conteúdo** para salvar como rascunho. Rascunhos só aparecem para o administrador.

## Observações

- O conteúdo não depende do navegador do visitante: fica no banco e no Storage do Supabase.
- A preferência de tema fica salva localmente no navegador.
- O bucket de arquivos é público para permitir abrir os materiais sem login; não envie documentos privados ou sensíveis.
- Se alterar políticas ou tabelas, revise também o arquivo SQL e teste com uma janela anônima.
