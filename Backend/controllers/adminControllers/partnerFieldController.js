const PartnerRegistrationField = require('../../models/PartnerRegistrationField');
const { logAdminAudit } = require('../../utils/adminAuditLogger');

// Default initial fields for partners if none are configured in database
const DEFAULT_INITIAL_FIELDS = [
  // Text Boxes
  {
    fieldKey: 'gstin',
    label: 'GSTIN Number',
    type: 'text',
    section: 'profile',
    placeholder: 'e.g. 22AAAAA0000A1Z5',
    helpText: 'Optional: GST identification number for registered business/contractors',
    isRequired: false,
    isActive: true,
    order: 1,
    isSystemDefault: false
  },
  {
    fieldKey: 'experience_years',
    label: 'Years of Experience',
    type: 'number',
    section: 'profile',
    placeholder: 'e.g. 5',
    helpText: 'Total years of hands-on service experience in this trade',
    isRequired: false,
    isActive: true,
    order: 2,
    isSystemDefault: false
  },
  {
    fieldKey: 'emergency_contact',
    label: 'Emergency Contact Person & Phone',
    type: 'text',
    section: 'profile',
    placeholder: 'e.g. Suresh Kumar - 9876543211 (Brother)',
    helpText: 'Secondary contact number in case of emergency',
    isRequired: false,
    isActive: true,
    order: 3,
    isSystemDefault: false
  },
  // Document Uploads
  {
    fieldKey: 'driving_license',
    label: 'Driving License',
    type: 'document',
    section: 'documents',
    placeholder: '',
    helpText: 'Upload valid Driving License (Front / Back photo or PDF)',
    isRequired: false,
    isActive: true,
    order: 1,
    isSystemDefault: false
  },
  {
    fieldKey: 'police_verification',
    label: 'Police Verification',
    type: 'document',
    section: 'documents',
    placeholder: '',
    helpText: 'Clear police verification certificate or character certificate',
    isRequired: false,
    isActive: true,
    order: 2,
    isSystemDefault: false
  },
  {
    fieldKey: 'skill_certificate',
    label: 'Trade / Skill Certificate',
    type: 'document',
    section: 'documents',
    placeholder: '',
    helpText: 'ITI diploma, training certification, or trade license',
    isRequired: false,
    isActive: true,
    order: 3,
    isSystemDefault: false
  }
];

/**
 * Helper to ensure default fields exist
 */
const ensureInitialFields = async () => {
  const count = await PartnerRegistrationField.countDocuments();
  if (count === 0) {
    await PartnerRegistrationField.insertMany(DEFAULT_INITIAL_FIELDS);
  }
};

/**
 * Generate a slug from label
 */
const slugify = (text) => {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'field';
};

/**
 * Public: Get active fields for partner registration form
 */
exports.getPublicPartnerFields = async (req, res) => {
  try {
    await ensureInitialFields();

    const fields = await PartnerRegistrationField.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      fields
    });
  } catch (error) {
    console.error('Error fetching public partner registration fields:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch registration fields',
      error: error.message
    });
  }
};

/**
 * Admin: Get all fields (active and inactive)
 */
exports.getAdminFields = async (req, res) => {
  try {
    await ensureInitialFields();

    const fields = await PartnerRegistrationField.find()
      .sort({ section: 1, order: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      fields
    });
  } catch (error) {
    console.error('Error fetching admin partner fields:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch partner fields',
      error: error.message
    });
  }
};

/**
 * Admin: Create a new dynamic field / document upload
 */
exports.createField = async (req, res) => {
  try {
    const {
      label,
      type,
      placeholder,
      helpText,
      options,
      isRequired,
      isActive,
      order,
      fieldKey: customFieldKey
    } = req.body;

    if (!label || !label.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Field label is required'
      });
    }

    const validTypes = ['text', 'number', 'textarea', 'select', 'document'];
    const resolvedType = validTypes.includes(type) ? type : 'text';
    const section = resolvedType === 'document' ? 'documents' : (req.body.section === 'documents' ? 'documents' : 'profile');

    // Generate unique fieldKey
    let key = customFieldKey ? slugify(customFieldKey) : slugify(label);
    let existing = await PartnerRegistrationField.findOne({ fieldKey: key });
    if (existing) {
      key = `${key}_${Date.now().toString().slice(-4)}`;
    }

    // Determine order
    let resolvedOrder = Number(order);
    if (isNaN(resolvedOrder)) {
      const highest = await PartnerRegistrationField.findOne({ section }).sort({ order: -1 }).select('order');
      resolvedOrder = highest ? (highest.order || 0) + 1 : 1;
    }

    const newField = await PartnerRegistrationField.create({
      fieldKey: key,
      label: label.trim(),
      type: resolvedType,
      section,
      placeholder: placeholder ? placeholder.trim() : '',
      helpText: helpText ? helpText.trim() : '',
      options: Array.isArray(options) ? options.map(o => String(o).trim()).filter(Boolean) : [],
      isRequired: Boolean(isRequired),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      order: resolvedOrder,
      isSystemDefault: false
    });

    logAdminAudit({
      req,
      module: 'workers',
      action: 'create',
      entityType: 'PartnerRegistrationField',
      entityId: newField._id,
      description: `Created dynamic partner ${resolvedType === 'document' ? 'document upload' : 'field'}: "${newField.label}"`
    });

    return res.status(201).json({
      success: true,
      message: 'Field created successfully',
      field: newField
    });
  } catch (error) {
    console.error('Error creating partner field:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create field',
      error: error.message
    });
  }
};

/**
 * Admin: Update an existing dynamic field
 */
exports.updateField = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      label,
      type,
      placeholder,
      helpText,
      options,
      isRequired,
      isActive,
      order,
      section
    } = req.body;

    const field = await PartnerRegistrationField.findById(id);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    if (label !== undefined && label.trim()) field.label = label.trim();
    if (type !== undefined) {
      field.type = type;
      if (type === 'document') {
        field.section = 'documents';
      } else if (section) {
        field.section = section;
      }
    } else if (section !== undefined) {
      field.section = section;
    }

    if (placeholder !== undefined) field.placeholder = placeholder.trim();
    if (helpText !== undefined) field.helpText = helpText.trim();
    if (options !== undefined && Array.isArray(options)) {
      field.options = options.map(o => String(o).trim()).filter(Boolean);
    }
    if (isRequired !== undefined) field.isRequired = Boolean(isRequired);
    if (isActive !== undefined) field.isActive = Boolean(isActive);
    if (order !== undefined && !isNaN(Number(order))) field.order = Number(order);

    await field.save();

    logAdminAudit({
      req,
      module: 'workers',
      action: 'update',
      entityType: 'PartnerRegistrationField',
      entityId: field._id,
      description: `Updated partner registration field: "${field.label}"`
    });

    return res.status(200).json({
      success: true,
      message: 'Field updated successfully',
      field
    });
  } catch (error) {
    console.error('Error updating partner field:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update field',
      error: error.message
    });
  }
};

/**
 * Admin: Toggle active status
 */
exports.toggleField = async (req, res) => {
  try {
    const { id } = req.params;
    const field = await PartnerRegistrationField.findById(id);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    field.isActive = !field.isActive;
    await field.save();

    logAdminAudit({
      req,
      module: 'workers',
      action: 'update',
      entityType: 'PartnerRegistrationField',
      entityId: field._id,
      description: `${field.isActive ? 'Enabled' : 'Disabled'} partner registration field "${field.label}"`
    });

    return res.status(200).json({
      success: true,
      message: `Field ${field.isActive ? 'activated' : 'deactivated'} successfully`,
      field
    });
  } catch (error) {
    console.error('Error toggling partner field:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle field status',
      error: error.message
    });
  }
};

/**
 * Admin: Delete a field
 */
exports.deleteField = async (req, res) => {
  try {
    const { id } = req.params;
    const field = await PartnerRegistrationField.findById(id);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    await PartnerRegistrationField.findByIdAndDelete(id);

    logAdminAudit({
      req,
      module: 'workers',
      action: 'delete',
      entityType: 'PartnerRegistrationField',
      entityId: id,
      description: `Deleted partner registration field "${field.label}"`
    });

    return res.status(200).json({
      success: true,
      message: 'Field deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting partner field:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete field',
      error: error.message
    });
  }
};

/**
 * Admin: Seed / Reset defaults
 */
exports.seedDefaultFields = async (req, res) => {
  try {
    for (const def of DEFAULT_INITIAL_FIELDS) {
      const exists = await PartnerRegistrationField.findOne({ fieldKey: def.fieldKey });
      if (!exists) {
        await PartnerRegistrationField.create(def);
      }
    }

    const fields = await PartnerRegistrationField.find().sort({ section: 1, order: 1 });
    return res.status(200).json({
      success: true,
      message: 'Default fields verified and initialized',
      fields
    });
  } catch (error) {
    console.error('Error seeding default partner fields:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to seed default fields',
      error: error.message
    });
  }
};
