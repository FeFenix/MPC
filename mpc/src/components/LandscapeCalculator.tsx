import React, { useEffect, useState } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from './KaTeX';
import {
  Box,
  Paper,
  Typography,
  Slider,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import { LandscapeCalculatorState, Feature, generateFreshState } from '../types/LandscapeTypes';
import { MAP_SIZE_CONFIG, FEATURES_CONFIG, CUSTOM_FEATURE_DEFAULT } from '../config/calculatorConfig';

// Constants per user's specification
const SIZE_THRESHOLD = 15000;
const T_MIN = 5; // days
const T_PER_MILLION = 0.21; // days per million blocks

// Compute pricing based on area
const computeFromSize = (width: number, length: number) => {
  const area = width * length;
  const A = area / 1_000_000;
  const derivedSize = Math.sqrt(area);
  const rawPbase = 26.58 * Math.pow(Math.max(A, 0), 0.414);
  const adjustedPbase = derivedSize >= SIZE_THRESHOLD ? rawPbase * 1.96 : rawPbase;
  // round to nearest tens per user request
  const basePrice = Math.round(adjustedPbase / 10) * 10;
  const recommendedDays = Math.max(T_MIN, Math.round(A * T_PER_MILLION));
  return { area, A, derivedSize, rawPbase, adjustedPbase, basePrice, recommendedDays };
};

// Update pricing and state after feature changes
const updatePricing = (s: LandscapeCalculatorState) => {
  const { width, length } = s.size;
  const pricing = computeFromSize(width, length);
  let totalPrice = pricing.basePrice;
  let extraDays = 0;

  const addFeatureCost = (f?: Feature) => (f && f.enabled ? f.pricePerUnit * f.quantity : 0);

  // Sum all regular features
    Object.entries(s.features).forEach(([k, f]) => {
    if (k === 'structures' || k === 'customFeature') return;
    totalPrice += addFeatureCost(f as Feature);
    if (f && (f as Feature).enabled) {
      extraDays += ((f as Feature).daysPerUnit || 0) * (((f as Feature).quantity) || 0);
    }
  });

  // Sum structure features
  Object.entries(s.features.structures).forEach(([, f]) => {
    totalPrice += addFeatureCost(f);
    if (f && (f as Feature).enabled) {
      extraDays += ((f as Feature).daysPerUnit || 0) * (((f as Feature).quantity) || 0);
    }
  });

  // Add custom feature cost
  if (s.features.customFeature) {
    totalPrice += addFeatureCost(s.features.customFeature);
    if (s.features.customFeature.enabled) {
      extraDays += (s.features.customFeature.daysPerUnit || 0) * ((s.features.customFeature.quantity) || 0);
    }
  }

  return {
    ...s,
    basePrice: pricing.basePrice,
    recommendedDays: pricing.recommendedDays,
    totalPrice: Math.max(0, Math.round(totalPrice)),
    totalDays: pricing.recommendedDays + Math.round(extraDays),
    area: pricing.area,
  } as LandscapeCalculatorState;
};

export const LandscapeCalculator: React.FC = () => {
  const [state, setState] = useState<LandscapeCalculatorState>(() =>
    updatePricing(generateFreshState())
  );

  const [tempInputs, setTempInputs] = useState<{ width: string; length: string }>({
    width: state.size.width.toString(),
    length: state.size.length.toString(),
  });

  // marks without textual labels per user request
  const SIZE_MARKS = [500,1000,2000,2500,5000,6000,10000,15000,20000,25000,30000].map(v=>({value:v}));

  // Initialize fresh state on mount
  useEffect(() => {
    const freshState = generateFreshState();
    setState(updatePricing(freshState));
    localStorage.removeItem('landscapeCalculator');
  }, []);

  // Sync temp inputs with state
  useEffect(() => {
    setTempInputs({
      width: state.size.width.toString(),
      length: state.size.length.toString(),
    });
  }, [state.size.width, state.size.length]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('landscapeCalculator', JSON.stringify(state));
  }, [state]);

  const handleSliderChange =
    (field: 'width' | 'length') =>
    (event: Event, value: number | number[]) => {
      const finalValue = value as number;
      const newState = {
        ...state,
        size: { ...state.size, [field]: finalValue },
      };
      setState(updatePricing(newState));
    };

  const handleManualSizeChange =
    (field: 'width' | 'length') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setTempInputs((prev: { width: string; length: string }) => ({ ...prev, [field]: event.target.value }));
    };

  const handleManualSizeBlur =
    (field: 'width' | 'length') =>
    (event: React.FocusEvent<HTMLInputElement>) => {
      const numValue = Number(tempInputs[field]);
      let clamped = numValue;

      if (isNaN(numValue) || numValue < MAP_SIZE_CONFIG.min) {
        clamped = MAP_SIZE_CONFIG.min;
      } else if (numValue > MAP_SIZE_CONFIG.max) {
        clamped = MAP_SIZE_CONFIG.max;
      }

      const newState = {
        ...state,
        size: { ...state.size, [field]: clamped },
      };
      setState(updatePricing(newState));
    };

  const handleFeatureChange =
    (path: string[], field: 'enabled' | 'quantity' | 'pricePerUnit' | 'daysPerUnit' | 'name', parser?: (v: string) => any) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let value: any = event.target.value;

      if (field === 'enabled') {
        value = (event.target as HTMLInputElement).checked;
      } else if (parser) {
        value = parser(value);
      }

      const newState: any = JSON.parse(JSON.stringify(state));
      // traverse from root
      let target: any = newState;
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]];
      }
      const last = path[path.length - 1];
      // target[last] should be the feature object
      if (!target[last]) {
        // defensive: if feature missing, create
        target[last] = {};
      }
      target[last][field] = value;

      setState(updatePricing(newState));
    };

  const renderFeatureRow = (
    label: string,
    feature: Feature | undefined,
    path: string[]
  ) => {
    if (!feature) return null;

    return (
      <TableRow key={label}>
        <TableCell sx={{ py: 1 }}>
          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(feature.enabled)}
                  onChange={handleFeatureChange(path, 'enabled')}
                  size="small"
                />
              }
              label={<Typography variant="body2">{(() => {
                if (path.includes('customFeature')) return feature.name || CUSTOM_FEATURE_DEFAULT.name;
                if (path.includes('structures')) return (FEATURES_CONFIG as any).structures?.[label]?.name || label;
                return (FEATURES_CONFIG as any)[label]?.name || label;
              })()}</Typography>}
            />
            {/* if custom feature allow editing name */}
            {path.includes('customFeature') && (
              <Box sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  value={feature.name || ''}
                  onChange={handleFeatureChange(path, 'name')}
                  placeholder="Custom feature name"
                />
              </Box>
            )}
          </Box>
        </TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          <TextField
            type="number"
            value={feature.quantity}
            onChange={handleFeatureChange(path, 'quantity', (v) => Math.max(1, parseInt(v) || 0))}
            disabled={!feature.enabled}
            inputProps={{ min: 1 }}
            size="small"
            sx={{ width: 60 }}
          />
        </TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          <TextField
            type="number"
            value={feature.pricePerUnit}
            onChange={handleFeatureChange(path, 'pricePerUnit', (v) => parseInt(v) || 0)}
            inputProps={{ step: 1 }}
            size="small"
            sx={{ width: 80 }}
          />
        </TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          <TextField
            type="number"
            value={feature.daysPerUnit}
            onChange={handleFeatureChange(path, 'daysPerUnit', (v) => parseInt(v) || 0)}
            inputProps={{ step: 1 }}
            size="small"
            sx={{ width: 60 }}
          />
        </TableCell>
      </TableRow>
    );
  };

  // Derived values
  const rectArea = state.size.width * state.size.length;
  const derivedSize = Math.sqrt(rectArea);
  const A = rectArea / 1_000_000;
  const rawPbase = 26.58 * Math.pow(Math.max(A, 0), 0.414);
  const PbaseAdjusted = derivedSize >= SIZE_THRESHOLD ? rawPbase * 1.96 : rawPbase;
  const formatNumber = (n: number, digits = 2) =>
    Number.isFinite(n) ? n.toFixed(digits) : 'N/A';

  const formatShort = (n: number) => (n >= 1000 ? `${Math.round(n/1000)}k` : String(n));
  const chunksWidth = Math.ceil(state.size.width / 16);
  const chunksLength = Math.ceil(state.size.length / 16);
  const totalChunks = chunksWidth * chunksLength;

  const texFormula = `P_{base} = 26.58\\cdot A^{0.414}`;
  // show width and length explicitly and the computed A
  const texA = `A = \\dfrac{${state.size.width}\\times ${state.size.length}}{10^{6}} = ${A.toFixed(3)}`;

  const getEnabledFeatures = () => {
    const features: { name: string; price: number; qty: number }[] = [];

    Object.entries(state.features).forEach(([key, f]) => {
      if (key === 'structures' || key === 'customFeature' || !f) return;
      const feat = f as Feature;
      if (feat.enabled) {
        const name = (FEATURES_CONFIG as any)[key]?.name || key;
        features.push({
          name,
          price: feat.pricePerUnit * feat.quantity,
          qty: feat.quantity || 0,
        });
      }
    });

    Object.entries(state.features.structures).forEach(([key, f]) => {
      if (f && (f as Feature).enabled) {
        const feat = f as Feature;
        const name = (FEATURES_CONFIG as any).structures?.[key]?.name || key;
        features.push({ name, price: feat.pricePerUnit * feat.quantity, qty: feat.quantity || 0 });
      }
    });

    if (state.features.customFeature && state.features.customFeature.enabled) {
      features.push({
        name: state.features.customFeature.name || CUSTOM_FEATURE_DEFAULT.name,
        price: state.features.customFeature.pricePerUnit * state.features.customFeature.quantity,
        qty: state.features.customFeature.quantity || 0,
      });
    }

    return features;
  };

  const handleClear = () => {
    const freshState = generateFreshState();
    setState(updatePricing(freshState));
    localStorage.removeItem('landscapeCalculator');
  };

  const handleConfirmOrder = () => {
    const summary = [
      '=== Minecraft Map Order ===',
      `Size: ${state.size.width}x${state.size.length} blocks`,
      `Total Price: $${state.totalPrice}`,
      `Delivery Time: ${state.totalDays} days`,
      ...getEnabledFeatures().map((f) => `${f.name}: $${f.price}`),
    ].join('\n');

    navigator.clipboard.writeText(summary);
    alert('Order summary copied to clipboard!');
  };

  return (
    <Box sx={{ width: '100%', px: { xs: 2, md: 6 }, py: { xs: 1, md: 2 } }}>
      <Box sx={{ mb: 4 }} />

      <Grid container spacing={3} sx={{ mt: 0 }}>
        {/* Map Size Section */}
        <Grid item xs={12} md={12}>
          <Paper elevation={6} sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.paper' }}>
            <Typography variant="h6" gutterBottom>
              Map Size
            </Typography>

            <Grid container spacing={2} sx={{ alignItems: 'flex-end' }}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Width: {state.size.width} blocks
                  </Typography>
                  <TextField
                    type="number"
                    value={tempInputs.width}
                    onChange={handleManualSizeChange('width')}
                    onBlur={handleManualSizeBlur('width')}
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Slider
                    value={state.size.width}
                    onChange={handleSliderChange('width')}
                    min={MAP_SIZE_CONFIG.min}
                    max={MAP_SIZE_CONFIG.max}
                    step={100}
                    marks={SIZE_MARKS}
                    valueLabelDisplay="auto"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Length: {state.size.length} blocks
                  </Typography>
                  <TextField
                    type="number"
                    value={tempInputs.length}
                    onChange={handleManualSizeChange('length')}
                    onBlur={handleManualSizeBlur('length')}
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Slider
                    value={state.size.length}
                    onChange={handleSliderChange('length')}
                    min={MAP_SIZE_CONFIG.min}
                    max={MAP_SIZE_CONFIG.max}
                    step={100}
                    marks={SIZE_MARKS}
                    valueLabelDisplay="auto"
                  />
                </Box>

                <Divider sx={{ my: 1 }} />
                <Typography variant="body2">Area: {(rectArea / 1_000_000).toFixed(2)}M blocks</Typography>
                <Typography variant="body2">Recommended days: {state.recommendedDays}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Size (short): {formatShort(state.size.width)} x {formatShort(state.size.length)}
                </Typography>
                <Typography variant="body2">Chunks: {totalChunks} ({chunksWidth} x {chunksLength})</Typography>
                <Divider sx={{ my: 2 }} />
              </Grid>

              <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 220 }}>
                  <Box sx={{ position: 'relative', width: 220, height: 220, border: '1px solid #ddd', bgcolor: '#fafafa' }}>
                    {/* proportional inner rectangle with arrows and labels */}
                    {(() => {
                      const max = 180; // inner max
                      const w = state.size.width;
                      const h = state.size.length;
                      let innerW = max;
                      let innerH = max;
                      if (w === 0 || h === 0) { innerW = innerH = 10; }
                      else if (w >= h) {
                        innerW = max;
                        innerH = Math.max(8, Math.round(max * (h / w)));
                      } else {
                        innerH = max;
                        innerW = Math.max(8, Math.round(max * (w / h)));
                      }
                      const left = Math.round((220 - innerW) / 2);
                      const top = Math.round((220 - innerH) / 2);
                      return (
                        <>
                          {/* full-width top arrow with label */}
                                    <Box sx={{ position: 'absolute', top: -10, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                                      <Box sx={{ display: 'inline-block', bgcolor: '#1976d2', color: 'white', fontWeight: 600, px: 1, py: '2px', borderRadius: 0.5, boxShadow: '0 1px 0 rgba(0,0,0,0.06)', textAlign: 'center', fontSize: 12 }}>
                                        {`Width: ${state.size.width}`}
                                      </Box>
                                    </Box>
                                    <svg viewBox="0 0 220 12" preserveAspectRatio="none" style={{ position: 'absolute', top: 8, left: 8, right: 8, width: 'calc(100% - 16px)', height: 10 }}>
                            <defs>
                                        <marker id="arrowHead" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto">
                                          <path d="M0,0 L5,2.5 L0,5 z" fill="#1976d2" />
                                        </marker>
                            </defs>
                                      <line x1="20" y1="5" x2="200" y2="5" stroke="#1976d2" strokeWidth="2" markerStart="url(#arrowHead)" markerEnd="url(#arrowHead)" strokeLinecap="round" />
                          </svg>

                          {/* full-height right arrow with label */}
                          <Box sx={{ position: 'absolute', right: -48, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Box sx={{ display: 'inline-block', color: '#1976d2', fontWeight: 600, fontSize: 12, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                              {`Length: ${state.size.length}`}
                            </Box>
                          </Box>
                          <svg viewBox="0 0 12 220" preserveAspectRatio="none" style={{ position: 'absolute', top: 20, right: 8, width: 10, height: 'calc(100% - 40px)' }}>
                            <defs>
                              <marker id="arrowHeadV" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
                                <polygon points="0,0 5,2.5 0,5" fill="#1976d2" />
                              </marker>
                            </defs>
                            <line x1="6" y1="10" x2="6" y2="200" stroke="#1976d2" strokeWidth="2" markerStart="url(#arrowHeadV)" markerEnd="url(#arrowHeadV)" strokeLinecap="round" />
                          </svg>
                          <Box sx={{ position: 'absolute', left, top, width: innerW, height: innerH, bgcolor: '#1976d2', opacity: 0.12, border: '2px solid rgba(25,118,210,0.6)' }} />
                        </>
                      );
                    })()}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Pricing Formula (separate block) and Total sidebar */}
        <Grid item xs={12} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper elevation={6} sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.paper' }}>
              <Typography variant="h6" gutterBottom>
                Pricing Formula
              </Typography>
              <Box sx={{ mb: 1 }}>
                <BlockMath math={texFormula} />
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Inserted values: width = {state.size.width} blocks, length = {state.size.length} blocks
                </Typography>
                <BlockMath math={`A = \\dfrac{${state.size.width} \\times ${state.size.length}}{10^{6}} = ${A.toFixed(3)}`} />
                <Typography variant="body2" sx={{ mt: 1 }}>Raw Pbase: ${formatNumber(rawPbase)}</Typography>
                <Typography variant="body2">Adjusted Pbase: ${formatNumber(PbaseAdjusted)} {derivedSize >= SIZE_THRESHOLD ? '(multiplier 1.96 applied)' : ''}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>Final Base Price (rounded to tens): ${state.basePrice}</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper
              elevation={6}
              sx={{
                p: { xs: 2, md: 4 },
                bgcolor: '#1976d2',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography variant="h5" align="center" gutterBottom>
                Total
              </Typography>
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                <Typography variant="caption">Price</Typography>
                <Typography variant="h4">${state.totalPrice}</Typography>
                <Typography variant="h6">Up to {state.totalDays} days</Typography>
              </Box>

              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />

              {getEnabledFeatures().length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Features:
                  </Typography>
                  <Box sx={{ mb: 2, pl: 1 }}>
                    {getEnabledFeatures().map((f, i) => (
                      <Typography key={i} variant="body2" display="block">
                        {f.name} x{f.qty}: ${f.price}
                      </Typography>
                    ))}
                  </Box>
                  <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
                </>
              )}

              <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  onClick={handleClear}
                >
                  Clear
                </Button>
                <Button
                  variant="contained"
                  sx={{ bgcolor: '#4caf50' }}
                  fullWidth
                  onClick={handleConfirmOrder}
                >
                  Confirm
                </Button>
              </Box>
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        {/* Features Table */}
        <Grid item xs={12}>
          <Paper elevation={6} sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.paper', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Additional Features
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Feature</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Price/unit</TableCell>
                    <TableCell align="right">Days/unit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(state.features).map(([key, feature]) => {
                    if (key === 'structures' || key === 'customFeature') return null;
                    return renderFeatureRow(key, feature as Feature, ['features', key]);
                  })}

                  {Object.entries(state.features.structures).map(([key, feature]) =>
                    renderFeatureRow(key, feature as Feature, ['features', 'structures', key])
                  )}

                  {renderFeatureRow(
                    'Custom Feature',
                    state.features.customFeature,
                    ['features', 'customFeature']
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}; 