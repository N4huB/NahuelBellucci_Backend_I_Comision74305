const express = require('express');
const Product = require('../models/product.model');
const router = express.Router();

// GET /api/products — paginación, filtro (category o status) y sort por price
router.get('/', async (req, res) => {
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
            filter.category = req.query.query; // respeta el texto original
        }
        }

        const sortOption = {};
        if (sort === 'asc') sortOption.price = 1;
        if (sort === 'desc') sortOption.price = -1;

        const skip = (page - 1) * limit;
        const [total, payload] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter).sort(sortOption).skip(skip).limit(limit)
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limit));
        const hasPrevPage = page > 1;
        const hasNextPage = page < totalPages;
        const prevPage = hasPrevPage ? page - 1 : null;
        const nextPage = hasNextPage ? page + 1 : null;

        const baseUrl = req.baseUrl || '/api/products';
        const buildLink = (p) => {
        if (!p) return null;
        const params = new URLSearchParams({ ...req.query, page: String(p), limit: String(limit) });
        return `${baseUrl}?${params.toString()}`;
        };

        return res.json({
        status: 'success',
        payload,
        totalPages,
        prevPage,
        nextPage,
        page,
        hasPrevPage,
        hasNextPage,
        prevLink: buildLink(prevPage),
        nextLink: buildLink(nextPage)
        });
    } catch (err) {
        console.error('GET /api/products error:', err);
        return res.status(500).json({ status: 'error', error: 'Internal server error' });
    }
});

// GET /api/products/:pid
router.get('/:pid', async (req, res) => {
    try {
        const product = await Product.findById(req.params.pid);
        return product ? res.json(product) : res.status(404).json({ error: 'Not found' });
    } catch {
        return res.status(400).json({ error: 'Invalid id' });
    }
});

// POST /api/products
router.post('/', async (req, res) => {
    try {
        const { title, description, code, price, status, stock, category, thumbnails } = req.body;
        if (!title || !description || !code || price === undefined || stock === undefined || !category) {
        return res.status(400).json({ error: 'Missing fields' });
        }
        const created = await Product.create({
        title,
        description,
        code,
        price,
        status: status ?? true,
        stock,
        category,
        thumbnails: thumbnails || []
        });
        
        // Emitir evento para tiempo real (opcional)
        const io = req.app.get('io');
        if (io) io.emit('products', await Product.find());
        
        return res.status(201).json(created);
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: 'code must be unique' });
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/products/:pid
router.put('/:pid', async (req, res) => {
    try {
        const update = { ...req.body };
        delete update._id;
        const updated = await Product.findByIdAndUpdate(req.params.pid, update, { new: true });
        return updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
    } catch {
        return res.status(400).json({ error: 'Invalid id' });
    }
});

// DELETE /api/products/:pid
router.delete('/:pid', async (req, res) => {
    try {
        const result = await Product.findByIdAndDelete(req.params.pid);
        
        // Emitir evento para tiempo real (opcional)
        const io = req.app.get('io');
        if (io) io.emit('products', await Product.find());
        
        return result ? res.json({ status: 'deleted' }) : res.status(404).json({ error: 'Not found' });
    } catch {
        return res.status(400).json({ error: 'Invalid id' });
    }
});

module.exports = router;