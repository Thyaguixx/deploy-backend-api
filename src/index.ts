import express from "express"
import cors from "cors"
import { Pool } from "pg"
import bcrypt from "bcrypt"
import nodemailer from "nodemailer";
import shortid from "shortid";
import dotenv from "dotenv"

dotenv.config() //Comando para captar as configurações do arquivo .env

const DB = new Pool({
    //connectionString: process.env.DB_URL2,  //conexão com banco no servidor gringo
    connectionString: process.env.DB_URL,     // conexão com banco no servidor da AWS de São Paulo
    ssl: {
        rejectUnauthorized: false
    }
})

// const DB = new Pool({
//     user: "postgres",
//     host: "localhost",
//     database: "API_Visiona",
//     password: "fatec",
//     port: 5432      //Porta padrão é 5432 ---- Porta 5555 é a do ELI
// })

const app = express()
app.use(cors())
app.use(express.json())

//Função para verificar se já tem cadastrado
async function existeUsuarioCadastrado(email) {
    return new Promise((resolve, reject) => {
        DB.query("SELECT * FROM usuarios WHERE usuario_email = '"+email+"'",
        (err, result) => {
            if (err) {
                console.log(`ERRO: ${err}`)
                reject(err)
            } else {
                resolve(result.rowCount > 0)
            }
        })
    })
}

//Função para verificar se já tem nome de usuário cadastrado
async function existeNomeUsuario(nomeUsuario) {
    return new Promise((resolve, reject) => {
        DB.query("SELECT * FROM usuarios WHERE nome_usuario = '"+nomeUsuario+"'",
        (err, result) => {
            if (err) {
                console.log(`ERRO: ${err}`)
                reject(err)
            } else {
                resolve(result.rowCount > 0)
            }
        })
    })
}

//Validar / Fazer login
app.post("/login", (req, res) => {
    const { email } = req.body
    const { password } = req.body

    let SQL = ("SELECT * FROM Usuarios WHERE usuario_email = '"+email+"' OR nome_usuario = '"+email+"'")

    DB.query(SQL, (err, result) => {
        if (err) {
            console.log(err)
        }
        
        if (result.rows.length === 1) {
            const senha_digitada = result.rows.values().next().value.usuario_senha
            bcrypt.compare(password, senha_digitada, function(_, response){
                if (response) {
                    console.log(result.rows.values().next().value.usuario_id)
                    console.log(result.rows.values().next().value.usuario_tipo)
                    res.send({
                        msg: "Usuário logado com sucesso.",
                        status: result.rows.values().next().value.usuario_status_registro,
                        id: result.rows.values().next().value.usuario_id,
                        tipo: result.rows.values().next().value.usuario_tipo
                    });
                    
                } else {
                    res.send({msg: 'Email / Usuário ou Senha incorretos.'})
                    
                }
            })
        } else {
            res.send({msg: 'Este usuário não existe.'})
        }
    })
})

//Cadastrar um usuario no banco
app.post("/registro", async (req, res) => {
    const { nome } = req.body
    const { email } = req.body
    const { nomeUsuario } = req.body
    const { senha } = req.body
    
    const existeUsuario = await existeUsuarioCadastrado(email)
    const existeUsername = await existeNomeUsuario(nomeUsuario)

    if (existeUsuario) {
        res.send({msg: "Já existe uma conta com este email."})
    } else if (existeUsername) {
        res.send({msg: "Já existe uma conta com este nome de usuário."})
    } else {
        bcrypt.hash(senha, 10, (err, hash) => {
            if (err){
                res.send(err)
            } else {
                let SQL = ("INSERT INTO Usuarios (usuario_nome, usuario_email, nome_usuario, usuario_senha) VALUES ('"+nome+"','"+email+"', '"+nomeUsuario+"', '"+hash+"')")
                DB.query(SQL, (err, result) => {
                    if (err) {
                        res.send(err)
                    } else {
                        res.send({msg: "Cadastro realizado com sucesso.", erro: err})
                    }
                })
            }
        })
    }
})

//Cadastrar (sendo um administrador) um novo usuário
app.post("/registro-by-admin", async (req, res) => {
    const { nome } = req.body
    const { email } = req.body
    const { nomeUsuario } = req.body
    const { senha } = req.body
    const { tipo } = req.body

    const existeUsuario = await existeUsuarioCadastrado(email)
    const existeUsername = await existeNomeUsuario(nomeUsuario)

    if (existeUsuario) {
        res.send({msg: "Já existe uma conta com este email."})
    } else if (existeUsername) {
        res.send({msg: "Já existe uma conta com este nome de usuário."})
    } else {
        bcrypt.hash(senha, 10, (err, hash) => {
            if (err){
                res.send(err)
            } else {
                let SQL = ("INSERT INTO Usuarios (usuario_nome, usuario_email, nome_usuario, usuario_senha, usuario_tipo) VALUES ('"+nome+"','"+email+"', '"+nomeUsuario+"', '"+hash+"', '"+tipo+"')")
                DB.query(SQL, (err, result) => {
                    if (err) {
                        res.send(err)
                    } else {
                        res.send({msg: "Cadastro realizado com sucesso.", erro: err})
                    }
                })
            }
        })
    }
})

//Editar info do usuário sendo um admin
app.put("/editar-info-by-admin/:nomeParametro", (req, res) => {
    const nomeParametro = req.params.nomeParametro

    const { nome }      = req.body
    const { username }  = req.body
    const { email }     = req.body
    const { tipo }      = req.body
    const { status }    = req.body

    let SQL = ("UPDATE Usuarios SET usuario_nome = '"+nome+"', nome_usuario = '"+username+"', usuario_email = '"+email+"', usuario_tipo = '"+tipo+"', usuario_status_registro = '"+status+"' WHERE usuario_nome = '"+nomeParametro+"'")

    DB.query(SQL, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send({msg: "Usuário editado com sucesso."})
        }
    })
})

//Editar informações do usuário
app.put("/editar-info/:id", (req, res) => {
    const id = req.params.id

    const { nome } = req.body
    const { username } = req.body
    const { email } = req.body

    let SQL = ("UPDATE Usuarios SET usuario_nome = '"+nome+"', nome_usuario = '"+username+"', usuario_email = '"+email+"'  WHERE usuario_ID = '"+id+"'")

    DB.query(SQL, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send({msg: "Editado com sucesso."})
        }
    })
})

app.put("/editar-info-nome/:id", (req, res) => {
    const id = req.params.id

    const { nome } = req.body

    let SQL = ("UPDATE Usuarios SET usuario_nome = '"+nome+"' WHERE usuario_ID = '"+id+"'")

    DB.query(SQL, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send({msg: "Editado com sucesso."})
        }
    })
})

app.put("/editar-info-apelido/:id", (req, res) => {
    const id = req.params.id

    const { username } = req.body

    let SQL = ("UPDATE Usuarios SET nome_usuario = '"+username+"' WHERE usuario_ID = '"+id+"'")

    DB.query(SQL, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send({msg: "Editado com sucesso."})
        }
    })
})

app.put("/editar-info-nome-apelido/:id", (req, res) => {
    const id = req.params.id

    const { nome } = req.body
    const { username } = req.body

    let SQL = ("UPDATE Usuarios SET usuario_nome = '"+nome+"', nome_usuario = '"+username+"' WHERE usuario_ID = '"+id+"'")

    DB.query(SQL, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send({msg: "Editado com sucesso."})
        }
    })
})

//Pegar as ações do usuário
app.get("/readAcoes/:id", (req, res) => {
    const id = req.params.id

    let SQL = "SELECT tipo_acao, to_char(data_acao, 'DD/MM/YYYY HH24:MI:SS')FROM acoes WHERE id_usuario = '"+id+"'"
  
    DB.query(SQL, (err, data) => {
      if (err) return res.json(err);
      return res.status(200).json(data.rows);
    });
});

//Pegar todos os usuário (tela admin)
app.get("/allusers", (_, res) => {

    let SQL = "SELECT usuario_nome, nome_usuario, usuario_email, to_char(usuario_data_criacao, 'DD/MM/YYYY'), usuario_status_registro, usuario_tipo FROM usuarios"
  
    DB.query(SQL, (err, data) => {
      if (err) return res.json(err);
      return res.status(200).json(data.rows);
    });
});

//Pegar todas as ações (tela admin)
app.get("/usersAllAcoes", (_, res) => {

    let SQL = "SELECT usuario_nome, tipo_acao, to_char(data_acao, 'DD/MM/YYYY HH24:MI:SS') FROM usuarios JOIN acoes ON usuarios.usuario_id = acoes.id_usuario;"
  
    DB.query(SQL, (err, data) => {
      if (err) return res.json(err);
      return res.status(200).json(data.rows);
    });
});

app.post('/enviar-token', (req, res) => {
    const { email } = req.body

    shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@#') // Define os caracters que vão estar no token
    const token = shortid.generate().substring(0,6); // Gera o token

    const transporter = nodemailer.createTransport({ // Configuração SMTP
        host: "smtp-mail.outlook.com",
        port: 587,
        secure: false,
        auth: {
            user: "littletechlobby@outlook.com",
            pass: "littletech123"
        }
    });

    transporter.sendMail({ // Envia o Email
        from: 'littletechlobby@outlook.com',
        to: email, // Email destinatário
        subject: 'Seu Token',
        html: `Seu token é: <b>${token}</b>`
    })

    res.send({msg: "Sucesso", token: token})
});

app.get('/read-by-id/:id', (req, res) => {
    const id = req.params.id

    let SQL = "SELECT usuario_nome, usuario_email, nome_usuario, usuario_tipo, to_char(usuario_data_criacao, 'DD/MM/YYYY') FROM usuarios WHERE usuario_ID = '"+id+"'"

    DB.query(SQL, (err, result) => {
        if (err) {
            res.send(err)
        } else {
            res.send({
                nome: result.rows.values().next().value.usuario_nome,
                email: result.rows.values().next().value.usuario_email,
                username: result.rows.values().next().value.nome_usuario,
                tipo: result.rows.values().next().value.usuario_tipo,
                data: result.rows.values().next().value.to_char
            })
        }
    })
})

app.get('/read-by-email/:email', (req, res) => {
    const email = req.params.email

    let SQL = "SELECT usuario_id FROM usuarios WHERE usuario_email = '"+email+"'"
    
    DB.query(SQL, (err, result) => {
        if (err) {
            res.send(err)
        } else {
            res.send({
                id: result.rows.values().next().value.usuario_id,
            })
        }
    })
})

app.post("/registrarAcaoNome/:id", (req, res) => {
    const id = req.params.id

    let SQL = "INSERT INTO acoes (tipo_acao, id_usuario) VALUES ('Troca de nome','"+id+"')"
    DB.query(SQL, (err, result) => {
        if (err) {
            res.send(err)
        } else {
            res.send({msg: "Sucesso" })
        }
    })
})

app.post("/registrarAcaoApelido/:id", (req, res) => {
    const id = req.params.id

    let SQL = "INSERT INTO acoes (tipo_acao, id_usuario) VALUES ('Troca de usuário','"+id+"')"
    DB.query(SQL, (err, result) => {
        if (err) {
            res.send(err)
        } else {
            res.send({msg: "Sucesso" })
        }
    })
})

app.post("/registrarAcaoNomeApelido/:id", (req, res) => {
    const id = req.params.id

    let SQL = "INSERT INTO acoes (tipo_acao, id_usuario) VALUES ('Troca de nome e usuário','"+id+"')"
    DB.query(SQL, (err, result) => {
        if (err) {
            res.send(err)
        } else {
            res.send({msg: "Sucesso" })
        }
    })
})

app.put("/editarSenha/:id", (req, res) => {
    const id = req.params.id

    const { password } = req.body

    bcrypt.hash(password, 10, (err, hash) => {
        if (err){
            res.send(err)
        } else {

            let SQLUpdate = ("UPDATE usuarios SET usuario_senha = '"+hash+"' WHERE usuario_id = '"+id+"'")

            DB.query(SQLUpdate, (err, result) => {
                if (err) {
                    console.log(err)
                } else {
                    res.send({msg: "Editado com sucesso."})
                }
            })
        }
    })
})

app.post("/registrarAcaoSenha/:id", (req, res) => {
    const id = req.params.id

    let SQL = "INSERT INTO acoes (tipo_acao, id_usuario) VALUES ('Troca de senha','"+id+"')"
    DB.query(SQL, (err, result) => {
        if (err) {
            res.send(err)
        } else {
            res.send({msg: "Sucesso" })
        }
    })
})

app.post("/registrarAcaoEmail/:id", (req, res) => {
    const id = req.params.id

    let SQL = "INSERT INTO acoes (tipo_acao, id_usuario) VALUES ('Troca de email','"+id+"')"
    DB.query(SQL, (err, result) => {
        if (err) {
            res.send(err)
        } else {
            res.send({msg: "Sucesso" })
        }
    })
})

app.put("/editar-info-email/:id", (req, res) => {
    const id = req.params.id

    const { email } = req.body

    let SQL = ("UPDATE Usuarios SET usuario_email = '"+email+"' WHERE usuario_ID = '"+id+"'")

    DB.query(SQL, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send({msg: "Editado com sucesso."})
        }
    })
})

app.put("/editar-info-nome-email/:id", (req, res) => {
    const id = req.params.id

    const { nome } = req.body
    const { email } = req.body

    let SQL = ("UPDATE Usuarios SET usuario_nome = '"+nome+"', usuario_email = '"+email+"' WHERE usuario_ID = '"+id+"'")

    DB.query(SQL, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send({msg: "Editado com sucesso."})
        }
    })
})
app.post("/registrarAcaoNomeEmail/:id", (req, res) => {
    const id = req.params.id

    let SQL = "INSERT INTO acoes (tipo_acao, id_usuario) VALUES ('Troca de nome e email','"+id+"')"
    DB.query(SQL, (err, result) => {
        if (err) {
            res.send(err)
        } else {
            res.send({msg: "Sucesso" })
        }
    })
})
//usuario e email
app.put("/editar-info-usuario-email/:id", (req, res) => {
    const id = req.params.id

    const { username } = req.body
    const { email } = req.body

    let SQL = ("UPDATE Usuarios SET nome_usuario = '"+username+"', usuario_email = '"+email+"' WHERE usuario_ID = '"+id+"'")

    DB.query(SQL, (err, result) => {
        if (err) {
            console.log(err)
        } else {
            res.send({msg: "Editado com sucesso."})
        }
    })
})
app.post("/registrarAcaoUsuarioEmail/:id", (req, res) => {
    const id = req.params.id

    let SQL = "INSERT INTO acoes (tipo_acao, id_usuario) VALUES ('Troca de usuário e email','"+id+"')"
    DB.query(SQL, (err, result) => {
        if (err) {
            res.send(err)
        } else {
            res.send({msg: "Sucesso" })
        }
    })
})

app.post("/registrarAcaoNomeUsuarioEmail/:id", (req, res) => {
    const id = req.params.id

    let SQL = "INSERT INTO acoes (tipo_acao, id_usuario) VALUES ('Troca de nome, usuário e email','"+id+"')"
    DB.query(SQL, (err, result) => {
        if (err) {
            res.send(err)
        } else {
            res.send({msg: "Sucesso" })
        }
    })
})

app.delete("/inativarUsuario/:nome", (req, res) => {
    const nome  = req.params.nome
    DB.query(`SELECT usuario_status_registro FROM usuarios WHERE usuario_nome = $1`, [nome], (err, result) => {
        if (err) {
            console.log(err)
            res.send({msg: `ERRO: ${err}`})
        } else {
            if (result.rowCount === 0) {
                res.send({msg: "Usuário não encontrado."})
            } else {
                const statusRegistro = result.rows[0].usuario_status_registro
                if (statusRegistro === 'Ativo') {
                    DB.query(`UPDATE usuarios SET usuario_status_registro = 'Inativo' WHERE usuario_nome = $1`, [nome], (err, result) => {
                        if (err) {
                            console.log(err)
                        } else {
                            res.send({msg: 'Usuário inativado com sucesso.'})
                        }
                    })
                }
            }
        }
    })
})

app.put("/reativarUsuario/:nome", (req, res) => {
    const nome = req.params.nome;
    DB.query(
      `SELECT usuario_status_registro FROM usuarios WHERE usuario_nome = $1`,
      [nome],
      (err, result) => {
        if (err) {
          console.log(err);
          res.send({ msg: `ERRO: ${err}` });
        } else {
          if (result.rowCount === 0) {
            res.send({ msg: "Usuário não encontrado." });
          } else {
            const statusRegistro = result.rows[0].usuario_status_registro;
            if (statusRegistro === "Inativo") {
              DB.query(
                `UPDATE usuarios SET usuario_status_registro = 'Ativo' WHERE usuario_nome = $1`,
                [nome],
                (err, result) => {
                  if (err) {
                    console.log(err);
                  } else {
                    res.send({ msg: "Usuário reativado com sucesso." });
                  }
                }
              );
            } else {
              res.send({ msg: "O usuário já está ativo." });
            }
          }
        }
      }
    );
});


app.listen(3001, () => {
    console.log("Servidor rodando!")
})