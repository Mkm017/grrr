import React, { useState, useEffect } from 'react'
import { MenuItem, ItemVariant, Addon } from '@grrr/contracts'
import { getFoodImageUrl } from '../lib/foodImages'

interface CustomizationModalProps {
    item: MenuItem | null
    isOpen: boolean
    onClose: () => void
    mode?: 'new' | 'customize-existing' // new = add new line item, customize-existing = update existing
    onAdd: (config: {
        item: MenuItem
        selectedVariant: ItemVariant | null
        selectedAddons: Addon[]
        totalPrice: number
        mode: 'new' | 'customize-existing'
    }) => void
    // Pre-selected values when customizing existing
    existingVariant?: ItemVariant | null
    existingAddons?: Addon[]
}

export default function CustomizationModal({ item, isOpen, onClose, onAdd, mode = 'new', existingVariant, existingAddons }: CustomizationModalProps) {
    const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null)
    const [selectedAddons, setSelectedAddons] = useState<Addon[]>([])
    const [quantity, setQuantity] = useState(1)
    const [selectedMode, setSelectedMode] = useState<'new' | 'customize-existing'>(mode)

    useEffect(() => {
        if (isOpen && item) {
            setSelectedMode(mode)
            if (mode === 'customize-existing') {
                setSelectedVariant(existingVariant ?? null)
                setSelectedAddons(existingAddons ?? [])
            } else {
                setSelectedVariant(null)
                setSelectedAddons([])
            }
            setQuantity(1)
        }
    }, [isOpen, item, mode, existingVariant, existingAddons])

    if (!isOpen || !item) return null

    const formatPrice = (cents: number) => `₹${(cents / 100 * 83).toFixed(0)}`

    const basePrice = selectedVariant?.priceOverride ?? item.price
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
    const totalPerItem = basePrice + addonsTotal
    const totalPrice = totalPerItem * quantity

    const toggleAddon = (addon: Addon, group: any) => {
        setSelectedAddons(prev => {
            const exists = prev.find(a => a.id === addon.id)
            if (exists) {
                return prev.filter(a => a.id !== addon.id)
            }
            // Check max selection
            const groupAddons = prev.filter(a => a.groupId === addon.groupId)
            if (groupAddons.length >= group.maxSelection) {
                return [...prev.filter(a => a.groupId !== addon.groupId), addon]
            }
            return [...prev, addon]
        })
    }

    const hasVariantsOrAddons = (item.variants && item.variants.length > 0) || (item.addonGroups && item.addonGroups.length > 0)

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal customization-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Customize</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    <div className="customization-item-image">
                        <img
                            src={getFoodImageUrl(item.name, item.imageUrl)}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                    </div>
                    <h3 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>{item.name}</h3>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                        {item.description}
                    </p>

                    {/* Mode selector: shown only when item is already in cart */}
                    {mode === 'customize-existing' && (
                        <div className="customize-mode-selector">
                            <button
                                className={`mode-btn ${selectedMode === 'customize-existing' ? 'active' : ''}`}
                                onClick={() => setSelectedMode('customize-existing')}
                            >
                                <span>✏️</span>
                                <div>
                                    <div style={{ fontWeight: 700 }}>Customize Current</div>
                                    <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>Update add-ons on existing item</div>
                                </div>
                            </button>
                            <button
                                className={`mode-btn ${selectedMode === 'new' ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedMode('new')
                                    setSelectedVariant(null)
                                    setSelectedAddons([])
                                    setQuantity(1)
                                }}
                            >
                                <span>➕</span>
                                <div>
                                    <div style={{ fontWeight: 700 }}>Add New Item</div>
                                    <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>Add a separate item</div>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Variants / Sizes */}
                    {item.variants && item.variants.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Select Size</h4>
                            {item.variants.map(variant => {
                                const priceDiff = (variant.priceOverride ?? item.price) - item.price
                                const isSelected = selectedVariant?.id === variant.id
                                return (
                                    <div
                                        key={variant.id}
                                        className={`variant-option ${isSelected ? 'selected' : ''}`}
                                        onClick={() => setSelectedVariant(isSelected ? null : variant)}
                                    >
                                        <span>{variant.name}</span>
                                        <span className="price-diff">
                                            {priceDiff > 0 ? `+${formatPrice(priceDiff)}` : priceDiff < 0 ? `-${formatPrice(Math.abs(priceDiff))}` : 'Base Price'}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Addons */}
                    {item.addonGroups?.map(group => (
                        <div key={group.id} style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                {group.name}
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                    {' '}(Max: {group.maxSelection})
                                </span>
                            </h4>
                            {group.addons?.map(addon => {
                                const isSelected = selectedAddons.some(a => a.id === addon.id)
                                return (
                                    <div key={addon.id} className="addon-option">
                                        <label className="addon-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleAddon({ ...addon, groupId: group.id }, group)}
                                            />
                                            <span>{addon.name}</span>
                                        </label>
                                        <span className="addon-price">+{formatPrice(addon.price)}</span>
                                    </div>
                                )
                            })}
                        </div>
                    ))}

                    {/* If no variants or addons, show a simple message */}
                    {!hasVariantsOrAddons && (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            This item has no customization options.
                        </div>
                    )}

                    {/* Quantity (only for 'new' mode) */}
                    {selectedMode === 'new' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Quantity</span>
                            <div className="quantity-control">
                                <button className="quantity-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                                <span className="quantity-value" style={{ minWidth: 30 }}>{quantity}</span>
                                <button className="quantity-btn" onClick={() => setQuantity(q => q + 1)}>+</button>
                            </div>
                        </div>
                    )}

                    {/* Price Summary + Add Button */}
                    <div style={{
                        background: 'var(--bg-hover)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {selectedMode === 'customize-existing' ? 'Item Price' : 'Total'}
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                                {selectedMode === 'customize-existing' ? formatPrice(totalPerItem) : formatPrice(totalPrice)}
                            </div>
                            {selectedMode === 'new' && quantity > 1 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {formatPrice(totalPerItem)} each
                                </div>
                            )}
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ padding: '0.75rem 2rem' }}
                            onClick={() => {
                                onAdd({
                                    item,
                                    selectedVariant,
                                    selectedAddons,
                                    totalPrice,
                                    mode: selectedMode
                                })
                                onClose()
                            }}
                        >
                            {selectedMode === 'customize-existing'
                                ? '✓ Update Item'
                                : `Add ${quantity} Item${quantity > 1 ? 's' : ''} →`
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}