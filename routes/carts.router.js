const express = require('express');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
const router = express.Router();

// POST /api/carts — crear carrito
router.post('/', async (req, res) => {
    const created = await Cart.create({ products: [] });
    return res.status(201).json(created);
});

// GET /api/carts/:cid — obtener carrito con populate
router.get('/:cid', async (req, res) => {
    try {
        const cart = await Cart.findById(req.params.cid).populate('products.product');
        return cart ? res.json(cart) : res.status(404).json({ error: 'Not found' });
    } catch {
        return res.status(400).json({ error: 'Invalid id' });
    }
});

// POST /api/carts/:cid/product/:pid — agregar/incrementar producto
router.post('/:cid/product/:pid', async (req, res) => {
    try {
        const { cid, pid } = req.params;
        const [cart, prod] = await Promise.all([Cart.findById(cid), Product.findById(pid)]);
        if (!cart || !prod) return res.status(404).json({ error: 'Not found' });

        const item = cart.products.find(p => String(p.product) === String(pid));
        if (item) item.quantity += 1;
        else cart.products.push({ product: pid, quantity: 1 });

        await cart.save();
        const populated = await cart.populate('products.product');
        return res.json(populated);
    } catch {
        return res.status(400).json({ error: 'Invalid id' });
    }
});

// DELETE /api/carts/:cid/products/:pid — eliminar un producto del carrito
router.delete('/:cid/products/:pid', async (req, res) => {
    try {
        const { cid, pid } = req.params;
        const cart = await Cart.findById(cid);
        if (!cart) return res.status(404).json({ error: 'Cart not found' });
        cart.products = cart.products.filter(p => String(p.product) !== String(pid));
        await cart.save();
        return res.json({ status: 'ok' });
    } catch {
        return res.status(400).json({ error: 'Invalid id' });
    }
});

// PUT /api/carts/:cid — reemplazar todos los products
router.put('/:cid', async (req, res) => {
    try {
        const { products } = req.body; // [{ product, quantity }]
        if (!Array.isArray(products)) return res.status(400).json({ error: 'products must be an array' });
        const cart = await Cart.findByIdAndUpdate(req.params.cid, { products }, { new: true });
        return cart ? res.json(cart) : res.status(404).json({ error: 'Not found' });
    } catch {
        return res.status(400).json({ error: 'Invalid id' });
    }
});

// PUT /api/carts/:cid/products/:pid — actualizar quantity
router.put('/:cid/products/:pid', async (req, res) => {
    try {
        const { quantity } = req.body;
        if (quantity === undefined || Number.isNaN(Number(quantity)) || Number(quantity) < 0) {
        return res.status(400).json({ error: 'Invalid quantity' });
        }
        const cart = await Cart.findById(req.params.cid);
        if (!cart) return res.status(404).json({ error: 'Cart not found' });

        const item = cart.products.find(p => String(p.product) === String(req.params.pid));
        if (!item) return res.status(404).json({ error: 'Product not in cart' });

        item.quantity = Number(quantity);
        await cart.save();
        return res.json(cart);
    } catch {
        return res.status(400).json({ error: 'Invalid id' });
    }
});

// DELETE /api/carts/:cid — vaciar carrito
router.delete('/:cid', async (req, res) => {
    try {
        const cart = await Cart.findById(req.params.cid);
        if (!cart) return res.status(404).json({ error: 'Cart not found' });
        cart.products = [];
        await cart.save();
        return res.json({ status: 'ok' });
    } catch {
        return res.status(400).json({ error: 'Invalid id' });
    }
});

module.exports = router;