const { Schema, model, Types } = require('mongoose');

const cartSchema = new Schema({
    products: [{
        product: { type: Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, default: 1 }
    }]
}, { timestamps: true });

module.exports = model('Cart', cartSchema);