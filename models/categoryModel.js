const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
    },
    status: {
        type: Number,
        enum: [0, 1],
        default: 1
    },
    show_products: {
        type: Number,
        enum: [0, 1],
        default: 1
    },
    show_on_home: {
        type: Number,
        enum: [0, 1],
        default: 1
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    }],
    updated_at: {
        type: Date,
        default: Date.now
    },
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;