const express = require('express');
const CartManager = require('../managers/CartManager');
const router = express.Router();
const cm = new CartManager();

router.post('/', async (req, res) => {
    const newCart = await cm.createCart();
    res.status(201).json(newCart);
    });

    router.get('/:cid', async (req, res) => {
    const cart = await cm.getCartById(req.params.cid);
    cart ? res.json(cart.products) : res.status(404).json({ error: 'Not found' });
    });

    router.post('/:cid/product/:pid', async (req, res) => {
    const cart = await cm.addProductToCart(req.params.cid, req.params.pid);
    cart ? res.json(cart) : res.status(404).json({ error: 'Not found' });
    });

module.exports = router;