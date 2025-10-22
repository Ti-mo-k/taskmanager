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
    secret: "gyfgjkgngjhbh465478hhfdjhnl567789423601gfk",
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === "production", // true on HTTPS in production
        maxAge: 30 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax" // allows fetch requests from same origin
    }
}));

 
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
   port: process.env.MYSQL_ADDON_PORT,
   waitForConnections: true,
   connectionLimit: 10,
   queueLimit: 0,

   
    
})
// db.((error) =>{
//     if (error) {
//         console.log('errror', error)
//     } else {
//         console.log('database connection successful')
//     }
// })

const promiseDb = db.promise();

async function createTables() {
    try {
        await promiseDb.query(`
            CREATE TABLE IF NOT EXISTS users(
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL
            )
        `);
        console.log('Users table ready');

        await promiseDb.query(`
            CREATE TABLE IF NOT EXISTS list(
                id INT PRIMARY KEY AUTO_INCREMENT,
                task VARCHAR(255) NOT NULL,
                task_date DATE DEFAULT (CURDATE()),
                user_id INT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log('List table ready');
    } catch (err) {
        console.error('Error creating tables:', err);
    }
}
createTables();

app.post('/todo/register', 
    [check('email').isEmail(), check('password').isLength({ min: 8 })], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).send('Enter a valid email and a long password');
        }

        const { name, email, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            return res.status(400).send("Passwords do not match");
        }

        try {
            // Check if email exists
            const [existing] = await promiseDb.query('SELECT * FROM users WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(400).send('Email already exists');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user
            await promiseDb.query('INSERT INTO users (name,email,password) VALUES (?,?,?)', [name, email, hashedPassword]);

            res.redirect('/login');  // send response
        } catch (err) {
            console.error('Error during registration:', err);
            res.status(500).send('Server error');
        }
});


app.post('/todo/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1️⃣ Fetch user by email
        const [results] = await promiseDb.query('SELECT * FROM users WHERE email = ?', [email]);

        if (results.length === 0) {
            return res.status(400).send('Invalid email or password');
        }

        const user = results[0];

        // 2️⃣ Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('Invalid email or password');
        }

        // 3️⃣ Save session
        req.session.user = { id: user.id, email: user.email, name: user.name };

        // 4️⃣ Redirect to list page
        res.redirect('/list');
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Server error');
    }
});

function checkAuth(req, res, next) {
    if (!req.session.user) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({ error: 'Not authenticated' });
        } else {
            return res.redirect('/login');
        }
    }
    next();
}
  
app.post('/todo/add', checkAuth, (req, res) => {
    const { task, date } = req.body;
    const userId = req.session.user.id;

    // Use today's date if date is missing or empty
    const taskDate = date && date.trim() !== '' ? date : new Date().toISOString().split('T')[0];

    if (!task || task.trim() === '') {
        return res.status(400).send('Task cannot be empty');
    }

    promiseDb.query(
  'INSERT INTO list (task, task_date, user_id) VALUES (?, ?, ?)',
  [task.trim(), taskDate, userId],
  (error) => {
    if (error) {
      console.log('Error inserting task:', error.message);
      return res.status(500).json({ error: 'Server error' });
    }
    res.status(200).json({ message: 'Task added successfully' });
  }
);

});

app.get('/todo/view', checkAuth, (req, res) => {
    const date = req.query.date;
    const userId = req.session.user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const taskDate = date || new Date().toISOString().split('T')[0];

    promiseDb.query(
        'SELECT * FROM list WHERE task_date = ? AND user_id = ?',
        [taskDate, userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json(results);
        }
    );
});


// app.get('/todo/view', (req,res) =>{
//     db.query(`SELECT * FROM list `,(err, results) => {
//         if (err) return res.status(500).send('DB error');
//         res.json(results); 
//     })    
    
//  })

app.delete('/todo/delete/:id', (req, res) => {
    const { id } = req.params;
    promiseDb.query('DELETE FROM list WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).send('Delete failed');
        res.sendStatus(200);
    });
});

app.put('/todo/update/:id', (req,res) =>{
    const id = req.params.id
    const task = req.body.task
    promiseDb.query(`UPDATE list SET task = ? WHERE id = ?`,[task,id], (error) => {
        if (error) {
            return res.status(500).send('Error updating');
        }
        res.send('Updated');
    })
})

app.listen(3000,'0.0.0.0', () =>{
    console.log('The app is running on port 3000')
})