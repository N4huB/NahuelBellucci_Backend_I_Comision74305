const express = require('express');
const productsRouter = require('./routes/products.router');
const cartsRouter = require('./routes/carts.router');
const ProductManager = require('./managers/ProductManager');
const exphbs = require('express-handlebars');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const pm = new ProductManager();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);
app.use(express.static(path.join(__dirname, 'public')));

// Handlebars setup
app.engine('handlebars', exphbs.engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Vista home con todos los productos
app.get('/', async (req, res) => {
    const products = await pm.getProducts();
    res.render('home', { products });
});

// Vista realtimeproducts
app.get('/realtimeproducts', async (req, res) => {
    const products = await pm.getProducts();
    res.render('realTimeProducts', { products });
});

// Socket.io para productos en tiempo real
io.on('connection', async (socket) => {
    console.log('Cliente conectado');

    // Enviar productos actuales al conectar
    socket.emit('products', await pm.getProducts());

    // Agregar producto
    socket.on('addProduct', async (product) => {
        await pm.addProduct(product);
        io.emit('products', await pm.getProducts());
    });

    // Eliminar producto
    socket.on('deleteProduct', async (id) => {
        await pm.deleteProduct(id);
        io.emit('products', await pm.getProducts());
    });
});

server.listen(8080, () => {
    console.log('Servidor escuchando en puerto 8080');
});