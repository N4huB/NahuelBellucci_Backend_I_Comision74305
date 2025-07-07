const express = require('express');
const ProductManager = require('../managers/ProductManager');
const router = express.Router();
const pm = new ProductManager();

router.get('/', async (req, res) => {
    res.json(await pm.getProducts());
    });

    router.get('/:pid', async (req, res) => {
    const product = await pm.getProductById(req.params.pid);
    product ? res.json(product) : res.status(404).json({ error: 'Not found' });
    });

    router.post('/', async (req, res) => {
    const { title, description, code, price, status, stock, category, thumbnails } = req.body;
    if (!title || !description || !code || !price || status === undefined || !stock || !category || !thumbnails)
        return res.status(400).json({ error: 'Missing fields' });
    const newProduct = await pm.addProduct({ title, description, code, price, status, stock, category, thumbnails });
    res.status(201).json(newProduct);
    });

    router.put('/:pid', async (req, res) => {
    const update = { ...req.body };
    delete update.id;
    const updated = await pm.updateProduct(req.params.pid, update);
    updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
    });

    router.delete('/:pid', async (req, res) => {
    const deleted = await pm.deleteProduct(req.params.pid);
    deleted ? res.json({ status: 'deleted' }) : res.status(404).json({ error: 'Not found' });
    });

module.exports = router;