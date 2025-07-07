const fs = require('fs').promises;
const path = require('path');

class ProductManager {
    constructor() {
        this.path = path.join(__dirname, '../data/products.json');
    }

    async getProducts() {
        const data = await fs.readFile(this.path, 'utf-8');
        return JSON.parse(data);
    }

    async getProductById(id) {
        const products = await this.getProducts();
        return products.find(p => p.id == id);
    }

    async addProduct(product) {
        const products = await this.getProducts();
        const newId = products.length ? (parseInt(products[products.length - 1].id) + 1).toString() : "1";
        const newProduct = { id: newId, ...product };
        products.push(newProduct);
        await fs.writeFile(this.path, JSON.stringify(products, null, 2));
        return newProduct;
    }

    async updateProduct(id, update) {
        const products = await this.getProducts();
        const idx = products.findIndex(p => p.id == id);
        if (idx === -1) return null;
        const updated = { ...products[idx], ...update, id: products[idx].id };
        products[idx] = updated;
        await fs.writeFile(this.path, JSON.stringify(products, null, 2));
        return updated;
    }

    async deleteProduct(id) {
        let products = await this.getProducts();
        const prevLength = products.length;
        products = products.filter(p => p.id != id);
        if (products.length === prevLength) return false;
        await fs.writeFile(this.path, JSON.stringify(products, null, 2));
        return true;
    }
}

module.exports = ProductManager;