const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const exphbs = require('express-handlebars');

const mongoose = require('mongoose');
require('dotenv').config();

const productsRouter = require('./routes/products.router');
const cartsRouter = require('./routes/carts.router');
const Product = require('./models/product.model'); // Mongoose model
const Cart = require('./models/cart.model'); // Mongoose model

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Exponer io para usarlo desde los routers
app.set('io', io);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routers API
app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);

// Handlebars setup con helpers
const hbs = exphbs.create({
    helpers: {
        eq: (a, b) => a === b,
        multiply: (a, b) => a * b,
        calculateTotal: (products) => {
        return products.reduce((total, item) => total + (item.product.price * item.quantity), 0);
        }
    }
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/coderbackend';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => { 
        console.error('Error conectando a MongoDB:', err); 
        process.exit(1); 
});

// Vistas
app.get('/', async (req, res) => {
    const products = await Product.find().limit(20);
    res.render('home', { products });
});

app.get('/realtimeproducts', async (req, res) => {
    const products = await Product.find().limit(50);
    res.render('realTimeProducts', { products });
});

// Vista /products con paginación, filtros y sort
app.get('/products', async (req, res) => {
    try {
        let { limit = 10, page = 1, sort, query } = req.query;
        limit = Number(limit) || 10;
        page = Number(page) || 1;

        const filter = {};
        if (query) {
        const q = String(query).toLowerCase();
        if (q === 'available' || q === 'true' || q === 'false') {
            filter.status = (q === 'available' || q === 'true');
        } else {
            filter.category = req.query.query;
        }
    }

    const sortOption = {};
    if (sort === 'asc') sortOption.price = 1;
    if (sort === 'desc') sortOption.price = -1;

    const skip = (page - 1) * limit;
    const [total, products] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter).sort(sortOption).skip(skip).limit(limit)
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;
    const prevPage = hasPrevPage ? page - 1 : null;
    const nextPage = hasNextPage ? page + 1 : null;

    const buildLink = (p) => {
        if (!p) return null;
        const params = new URLSearchParams({ ...req.query, page: String(p), limit: String(limit) });
        return `/products?${params.toString()}`;
    };

    res.render('products', {
        products,
        pagination: {
            page,
            totalPages,
            hasPrevPage,
            hasNextPage,
            prevLink: buildLink(prevPage),
            nextLink: buildLink(nextPage)
        },
        query: req.query
    });
    } catch (err) {
        console.error('Error en /products:', err);
        res.status(500).render('error', { message: 'Error interno del servidor' });
    }
});

// Vista /carts/:cid con populate
app.get('/carts/:cid', async (req, res) => {
    try {
        const cart = await Cart.findById(req.params.cid).populate('products.product');
        if (!cart) return res.status(404).render('error', { message: 'Carrito no encontrado' });
        res.render('cart', { cart });
    } catch (err) {
        console.error('Error en /carts/:cid:', err);
        res.status(400).render('error', { message: 'ID de carrito inválido' });
    }
});

// Socket.io para productos en tiempo real
io.on('connection', async (socket) => {
    console.log('Cliente conectado');

  // Enviar productos actuales al conectar
    socket.emit('products', await Product.find());

  // Agregar producto rápido (con defaults)
    socket.on('addProduct', async (payload) => {
    try {
        const { title, price } = payload || {};
        if (!title || price === undefined) return;
        await Product.create({
            title,
            description: 'Sin descripción',
            code: `AUTO-${Date.now()}`,
            price: Number(price),
            status: true,
            stock: 10,
            category: 'general',
            thumbnails: [],
        });
        io.emit('products', await Product.find());
        } catch (err) {
        console.error('Error addProduct socket:', err);
        }
    });

  // Eliminar producto por _id de Mongo
    socket.on('deleteProduct', async (id) => {
    try {
        if (!id) return;
        await Product.findByIdAndDelete(id);
        io.emit('products', await Product.find());
    } catch (err) {
        console.error('Error deleteProduct socket:', err);
    }
    });
});

server.listen(8080, () => {
    console.log('Servidor escuchando en puerto 8080');
});