// Import required modules for web server, session management, form handling, password encryption, validation, and database connection
const express = require ('express')
const session = require ('express-session')
const bodyParser = require ('body-parser')
const bcrypt = require ('bcryptjs')
const path = require ('path')
const {check,validationResult} = require ('express-validator')
const mysql = require ('mysql2')
const { error } = require('console')
const dotenv = require('dotenv');


const app =express()
dotenv.config();

// session middleware
app.use(session({
    secret:"klnjfbhfv;kfvblnslk;ldv nlh;b",
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        maxAge: 30 * 60 * 1000,
        httpOnly:true
    }

}))
 
// middleware
app.use(express.json())
app.use(bodyParser.json())
app.use(express.urlencoded({extended:true}))
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname,'static')))
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('static', path.join(__dirname, 'static'));


app.get('/', (req,res) =>{
    res.sendFile(path.join(__dirname, 'static', 'register.html'))
})
app.get('/login', (req,res) =>{
    res.sendFile(path.join(__dirname, 'static', 'login.html'))
})
app.get('/list', checkAuth, (req, res) => {
    const name = req.session.user.name;
    res.render('index', { name });
});

app.get('/view', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'view.html'));
});


const db = mysql.createPool({
   host: process.env.MYSQL_ADDON_HOST,
   user: process.env.MYSQL_ADDON_USER,
   password:process.env.MYSQL_ADDON_PASSWORD,
   database:process.env.MYSQL_ADDON_DB,
   port: process.env.MYSQL_ADDON_PORT
   
    
})
// db.((error) =>{
//     if (error) {
//         console.log('errror', error)
//     } else {
//         console.log('database connection successful')
//     }
// })
const usersTable= (`
    CREATE TABLE IF NOT EXISTS users(
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
    )
    `)
db.query(usersTable,(error) =>{
    if (error) {
        console.error('Errror creating users table', error)
    } else {
        console.log('Users table created')
    }
})
const listTable =(`
    CREATE TABLE IF NOT EXISTS list(
    id INT PRIMARY KEY AUTO_INCREMENT,
    task VARCHAR(255) NOT NULL,
    task_date DATE DEFAULT (CURDATE()),
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id)

    )
`)

db.query(listTable,(error) =>{
    if (error) {
        console.log('Error creating list table', error)
    } else {
        console.log('List table created successfully')
    }
})
app.post('/todo/register', 
    [check('email').isEmail(),check('password').isLength({min:8})], async (req,res) =>{
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).send('enter a valid email and a long password')
        }
         
    const {name,email,password,confirmPassword}= req.body
    if (password !== confirmPassword) {
            return res.status(400).send("Passwords do not match")
        }

        db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
            if (err) return res.status(500).send('Database error');
            if (results.length > 0) return res.status(400).json({ error: 'Email already exists' });
        });   
    const hashedPassword = await bcrypt.hash(password,10) 
    
    db.query('INSERT INTO users (name,email,password) VALUES (?,?,?)', [name,email,hashedPassword],(error) =>{
        if (error){
            console.error('Error inserting user:', error);
             return res.status(500).send('Server error');
        }
        
        // res.status(200).send('User inserted successfully');
        res.redirect('/login')

    })

    })

app.post('/todo/login', async (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.log(err);
            res.status(500).send('Server error');
            return;
        }

        if (results.length === 0) {
            res.status(400).send('Invalid email or password');
            return;
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            res.status(400).send('Invalid email or password');
            return;
        }

        req.session.user = { id: user.id, email: user.email, name:user.name };
        res.redirect('/list');
    });
});
function checkAuth(req,res,next) {
    if(!req.session.user){
        return res.redirect('/login');
    }
    else{
        next()
    }

}    
app.post('/todo/add', checkAuth, (req, res) => {
    const { task, date } = req.body;
    const userId = req.session.user.id;

    // Use today's date if date is missing or empty
    const taskDate = date && date.trim() !== '' ? date : new Date().toISOString().split('T')[0];

    if (!task || task.trim() === '') {
        return res.status(400).send('Task cannot be empty');
    }

    db.query(
        'INSERT INTO list (task, task_date, user_id) VALUES (?, ?, ?)',
        [task.trim(), taskDate, userId],
        (error) => {
            if (error) {
                console.log('Error inserting task:', error.message);
                return res.status(500).send('Server error');
            }
            res.status(200).send('Task added successfully');
        }
    );
});

app.get('/todo/view',checkAuth, (req, res) => {
    const date = req.query.date;
    const userId = req.session.user.id;
 // format: YYYY-MM-DD
    db.query('SELECT * FROM list WHERE task_date = ? AND user_id = ?', [date,userId], (err, results) => {
        if (err) return res.status(500).send('DB error');
        res.json(results);
    });
});


// app.get('/todo/view', (req,res) =>{
//     db.query(`SELECT * FROM list `,(err, results) => {
//         if (err) return res.status(500).send('DB error');
//         res.json(results); 
//     })    
    
//  })

app.delete('/todo/delete/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM list WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).send('Delete failed');
        res.sendStatus(200);
    });
});

app.put('/todo/update/:id', (req,res) =>{
    const id = req.params.id
    const task = req.body.task
    db.query(`UPDATE list SET task = ? WHERE id = ?`,[task,id], (error) => {
        if (error) {
            return res.status(500).send('Error updating');
        }
        res.send('Updated');
    })
})

app.listen(3000,'0.0.0.0', () =>{
    console.log('The app is running on port 3000')
})