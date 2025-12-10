import React, { useEffect, useState } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
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
} from '@mui/material';
import { LandscapeCalculatorState, Feature, generateFreshState } from '../types/LandscapeTypes';
import { MAP_SIZE_CONFIG, FEATURES_CONFIG, CUSTOM_FEATURE_DEFAULT } from '../config/calculatorConfig';

// Constants per user's specification
const SIZE_THRESHOLD = 15000;
const T_MIN = 5; // days
const T_PER_MILLION = 0.21; // days per million blocks

// computeFromSize: returns area, A (millions), derivedSize, raw/adjusted prices and recommended days
const computeFromSize = (width: number, length: number) => {
  const area = width * length;
  const A = area / 1_000_000;
  const derivedSize = Math.sqrt(area);
  const rawPbase = 26.58 * Math.pow(Math.max(A, 0), 0.414);
  const adjustedPbase = derivedSize >= SIZE_THRESHOLD ? rawPbase * 1.96 : rawPbase;
  const basePrice = Math.round(adjustedPbase);
  const recommendedDays = Math.max(T_MIN, Math.round(A * T_PER_MILLION));
  return { area, A, derivedSize, rawPbase, adjustedPbase, basePrice, recommendedDays };
};

// updatePricing: given a state, compute prices/times per user's rules
const updatePricing = (s: LandscapeCalculatorState) => {
  const { width, length } = s.size;
  const pricing = computeFromSize(width, length);

  let totalPrice = pricing.basePrice;

  const addFeatureCost = (f?: Feature) => (f && f.enabled ? f.pricePerUnit * f.quantity : 0);

  Object.entries(s.features).forEach(([k, f]) => {
    if (k === 'structures' || k === 'customFeature') return;
    totalPrice += addFeatureCost(f as Feature);
  });

  Object.entries(s.features.structures).forEach(([, f]) => { totalPrice += addFeatureCost(f); });
  if (s.features.customFeature) totalPrice += addFeatureCost(s.features.customFeature);

  return {
    ...s,
    basePrice: pricing.basePrice,
    recommendedDays: pricing.recommendedDays,
    totalPrice: Math.max(0, Math.round(totalPrice)),
    totalDays: pricing.recommendedDays,
    area: pricing.area,
  } as LandscapeCalculatorState;
};

let orderNumber = 1;

const formatOrderNumber = (num: number): string => {
  return `#${String(num).padStart(6, '0')}`;
};

export const LandscapeCalculator: React.FC = () => {
  const [state, setState] = useState<LandscapeCalculatorState>(() => {
    // Force fresh config values on initial load
    const freshState = generateFreshState();
    console.log('Initial state generated:', freshState);
    return updatePricing(freshState);
  });

  // Add useEffect to refresh config values when component mounts
  useEffect(() => {
    const freshState = generateFreshState();
    console.log('Config refreshed on mount:', freshState);
    setState(updatePricing(freshState));
    localStorage.removeItem('landscapeCalculator'); // Clear any stored state
  }, []); // Run only on mount

  // Add state for temporary input values
  const [tempInputs, setTempInputs] = useState<{ width: string; length: string }>({
    width: state.size.width.toString(),
    length: state.size.length.toString()
  });

  // Update temp inputs when state changes
  useEffect(() => {
    setTempInputs({
      width: state.size.width.toString(),
      length: state.size.length.toString()
    });
  }, [state.size.width, state.size.length]);

  // Add useEffect to verify initialization when component mounts
  useEffect(() => {
    verifyEmailJSInit();
  }, []);

  useEffect(() => {
    localStorage.setItem('landscapeCalculator', JSON.stringify(state));
  }, [state]);

  const snapPoints = MAP_SIZE_CONFIG.snapPoints;
  const snapThreshold = MAP_SIZE_CONFIG.snapThreshold;

  const handleSizeChange = (field: 'width' | 'length' | 'deliveryDays') => (event: Event, value: number | number[]) => {
    let finalValue = value as number;
    
    // Apply snapping only for width and length
    if (field !== 'deliveryDays') {
      // Find the closest snap point if we're within the threshold
      const closestPoint = snapPoints.find(point => 
      const A = area / 1000000; // area in millions of blocks
      );
      if (closestPoint) {
        finalValue = closestPoint;
      }
    }

    const newState = {
      ...state,
      size: {
        ...state.size,
        [field]: finalValue,
      },
    };

    // If width or length changed, update delivery days to recommended
    if (field !== 'deliveryDays') {
      const updatedWidth = field === 'width' ? finalValue : state.size.width;
      const updatedLength = field === 'length' ? finalValue : state.size.length;
      const recommendedDays = Math.max(5, Math.round(A * 0.21)); // days per million blocks
    setState(updatePricing(newState));
  };

  const handleManualSizeChange = (field: 'width' | 'length') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    setTempInputs((prev: { width: string; length: string }) => ({
      ...prev,
      [field]: newValue
    }));

    if (newValue === '' || isNaN(Number(newValue))) {
      return;
    }

    const numValue = Number(newValue);
    
    if (!isNaN(numValue)) {
      const pricing = calculatePricing(width, length);
      
      if (finalValue !== state.size[field]) {
        const newState = {
          ...state,
          size: {
            ...state.size,
            [field]: finalValue,
          },
        setState(updatePricing(newState));
      }
    }
  };

  const handleInputBlur = (field: 'width' | 'length') => () => {
    const numValue = Number(tempInputs[field]);
    if (isNaN(numValue) || numValue < MAP_SIZE_CONFIG.min) {
      const newState = {
        ...state,
        size: {
          ...state.size,
          [field]: MAP_SIZE_CONFIG.min,
        },
      };
      setState(updatePricing(newState));
    } else if (numValue > MAP_SIZE_CONFIG.max) {
      const newState = {
        ...state,
        size: {
          ...state.size,
          [field]: MAP_SIZE_CONFIG.max,
        },
      };
      setState(updatePricing(newState));
    }
  };
      const totalDays = pricing.recommendedDays; // No additional days from features
  const handleFeatureChange = (
    feature: string,
    isStructure = false,
    field: 'enabled' | 'quantity' | 'pricePerUnit' | 'daysPerUnit' | 'name' = 'enabled'
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    let value: string | number | boolean = event.target.value;
    if (field === 'enabled') {
      value = (event.target as HTMLInputElement).checked;
    } else if (field === 'pricePerUnit') {
      value = parseFloat(event.target.value) || 0;
    } else if (field === 'daysPerUnit' || field === 'quantity') {
      value = parseInt(event.target.value) || 0;
    }

    const newState = { ...state };

    if (isStructure) {
      // Handle structure features
      if (feature in newState.features.structures) {
        newState.features.structures[feature as keyof typeof state.features.structures] = {
          ...newState.features.structures[feature as keyof typeof state.features.structures],
          [field]: value
        };
      }
    } else {
      // Handle regular features
      if (feature in newState.features && feature !== 'structures') {
        const featureKey = feature as keyof typeof state.features;
        if (featureKey !== 'structures') {
          newState.features[featureKey] = {
            ...newState.features[featureKey],
            [field]: value
          } as Feature;
        }
      }
    }

    setState(updatePricing(newState));
  };

  const renderFeatureRow = (
    featureKey: string,
    feature: Feature | undefined,
    onChange: (field: 'enabled' | 'quantity' | 'pricePerUnit' | 'daysPerUnit' | 'name') => (event: React.ChangeEvent<HTMLInputElement>) => void,
    isCustom = false
  ) => {
    if (!feature) return null;

    let featureConfig;
    if (isCustom) {
      featureConfig = CUSTOM_FEATURE_DEFAULT;
    } else if (featureKey in FEATURES_CONFIG) {
      if (featureKey === 'structures') {
        // Handle structures differently as they have a nested structure
        return null;
      } else {
        featureConfig = (FEATURES_CONFIG as any)[featureKey];
      }
    }
    
    if (!featureConfig && !isCustom) return null;
    
    return (
      <TableRow>
        <TableCell sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={feature.enabled}
                  onChange={onChange('enabled')}
                  size="small"
                />
              }
              label={
                <Box>
                  <Typography variant="body2">{isCustom ? (
                    <TextField
                      value={feature.name || ''}
                      onChange={onChange('name')}
                      size="small"
                      placeholder="Custom feature name"
                      sx={{ ml: 1 }}
                    />
                  ) : featureConfig.name}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {isCustom ? feature.description : featureConfig.description}
                  </Typography>
                </Box>
              }
            />
          </Box>
        </TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          <TextField
            type="number"
            value={feature.quantity}
            onChange={onChange('quantity')}
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
            onChange={onChange('pricePerUnit')}
            // allow editing price even if feature disabled so user can set custom values
            inputProps={{ min: 0, step: 0.01 }}
            size="small"
            sx={{ width: 80 }}
          />
        </TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          <TextField
            type="number"
            value={feature.daysPerUnit}
            onChange={onChange('daysPerUnit')}
            inputProps={{ min: 0 }}
            size="small"
            sx={{ width: 60 }}
          />
        </TableCell>
      </TableRow>
    );
  };

  const formatArea = (area: number) => {
    return (area / 1000000).toFixed(2);
  };

  // Derived values for the power-law formula requested by the user
  // Area in blocks (rectangular map)
  const rectArea = state.size.width * state.size.length;
  // size = side length for a square map equivalent to the area
  const derivedSize = Math.sqrt(rectArea);
  // A = area in millions of blocks
  const A = rectArea / 1_000_000;
  // Pbase = 26.58 * A^0.414
  const rawPbase = 26.58 * Math.pow(Math.max(A, 0), 0.414);
  // If size >= 15000, apply multiplier
  const SIZE_THRESHOLD = 15000;
  const PbaseAdjusted = derivedSize >= SIZE_THRESHOLD ? rawPbase * 1.96 : rawPbase;
  const formatNumber = (n: number, digits = 2) => Number.isFinite(n) ? n.toFixed(digits) : 'N/A';

  // Formula rendered as KaTeX string for BlockMath
  const texFormula = `P_{base} = 26.58\cdot A^{0.414}`;
  const texA = `A = \dfrac{size^{2}}{10^{6}} = \dfrac{${derivedSize.toFixed(0)}^{2}}{10^{6}} = ${A.toFixed(3)}`;

  const getEnabledFeatures = () => {
    const features: { name: string; price: number; days: number }[] = [];
    
    // Process regular features
    Object.entries(state.features).forEach(([key, feature]) => {
      if (key !== 'structures' && key !== 'customFeature' && feature) {
        const f = feature as Feature;
        if (f.enabled) {
          features.push({
            name: f.name || key,
            price: f.pricePerUnit * f.quantity,
            days: f.daysPerUnit * f.quantity
          });
        }
      }
    });

    // Process structures separately
    if (state.features.structures) {
      Object.entries(state.features.structures).forEach(([key, feature]) => {
        if (feature && feature.enabled) {
          features.push({
            name: key,
            price: feature.pricePerUnit * feature.quantity,
            days: feature.daysPerUnit * feature.quantity
          });
        }
      });
    }

    // Process custom feature
    const customFeature = state.features.customFeature;
    if (customFeature && customFeature.enabled) {
      features.push({
        name: customFeature.name || 'Custom Feature',
        price: customFeature.pricePerUnit * customFeature.quantity,
        days: customFeature.daysPerUnit * customFeature.quantity
      });
    }

    return features;
  };

  const handleClear = (): void => {
    // Create a fresh state using the latest config values
    const freshState = generateFreshState();
    setState(updatePricing(freshState));
    setTempInputs({
      width: String(freshState.size.width),
      length: String(freshState.size.length)
    });
    
    // Clear localStorage to ensure we don't load old values next time
    localStorage.removeItem('landscapeCalculator');
  };

  const handleConfirmOrder = async (): Promise<void> => {
    try {
      // Verify initialization before sending
      verifyEmailJSInit();
      
      const orderNum = formatOrderNumber(orderNumber);
      
      // Format order details as text
      const orderDetails = [
        '=== Minecraft Map Order ===',
        `Order Number: ${orderNum}`,
        '',
        '=== Map Details ===',
        `Size: ${state.size.width}x${state.size.length} blocks`,
        `Total Area: ${formatArea(state.area)} million blocks`,
        `Delivery Time: ${state.totalDays} days`,
        `Base Price: $${state.basePrice}`,
        '',
        '=== Additional Features ===',
        ...getEnabledFeatures().map(feature => 
          `${feature.name}: $${feature.price} (${feature.days} days)`
        ),
        '',
        '=== Pricing ===',
        `Total Price: $${state.totalPrice}`,
        '',
        state.totalDays !== state.recommendedDays ? 
          `Note: Delivery time is ${state.totalDays < state.recommendedDays ? 
            `${state.recommendedDays - state.totalDays} days faster (Additional cost: $${Math.abs((state.recommendedDays - state.totalDays) * PRICE_PER_DAY_ADJUSTMENT)})` : 
            `${state.totalDays - state.recommendedDays} days slower (Savings: $${Math.abs((state.totalDays - state.recommendedDays) * PRICE_PER_DAY_ADJUSTMENT)})`
          }` : ''
      ].filter(line => line !== '').join('\n');

      // Prepare email data
      const templateParams = {
        to_email: process.env.REACT_APP_EMAILJS_TO_EMAIL,
        order_number: orderNum,
        order_details: orderDetails,
        map_size: `${state.size.width}x${state.size.length}`,
        total_area: formatArea(state.area),
        delivery_time: state.totalDays,
        total_price: state.totalPrice,
        enabled_features: getEnabledFeatures()
          .map(feature => `${feature.name}: $${feature.price} (${feature.days} days)`)
          .join('\n'),
        name: "Minecraft Map Calculator",
        email: process.env.REACT_APP_EMAILJS_TO_EMAIL
      };

      console.log('Sending email with params:', templateParams);
      
      const result = await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID || '',
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID || '',
        templateParams,
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY || ''
      );
      
      console.log('Email result:', result);
      
      if (result.status === 200) {
        orderNumber++;
        alert('Order has been sent successfully!');
      } else {
        throw new Error(`Failed to send email. Status: ${result.status}`);
      }
    } catch (error: any) {
      console.error('Failed to send order. Error details:', error);
      alert(`Failed to send order. Error: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 4, backgroundColor: '#fff' }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
              Minecraft Landscape Map Calculator
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Map Size
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography></Typography>
                      <Typography>Width:</Typography>
                      <Typography></Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                          type="number"
                          value={tempInputs.width}
                          onChange={handleManualSizeChange('width')}
                          onBlur={handleInputBlur('width')}
                          onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                          inputProps={{ 
                            min: MAP_SIZE_CONFIG.min, 
                            max: MAP_SIZE_CONFIG.max,
                            style: { textAlign: 'right' }
                          }}
                          size="small"
                          sx={{ width: 100 }}
                        />
                        <Typography sx={{ ml: 1 }}>blocks</Typography>
                      </Box>
                    </Box>
                    <Slider
                      value={state.size.width}
                      min={MAP_SIZE_CONFIG.min}
                      max={MAP_SIZE_CONFIG.max}
                      step={100}
                      onChange={handleSizeChange('width')}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 1000, label: '1k' },
                        { value: 5000, label: '5k' },
                        { value: 10000, label: '10k' },
                        { value: 20000, label: '20k' },
                        { value: 25000, label: '25k' },
                      ]}
                      sx={{
                        '& .MuiSlider-mark': {
                          height: 10,
                          width: 2,
                          backgroundColor: '#bfbfbf',
                        },
                        '& .MuiSlider-markActive': {
                          backgroundColor: '#fff',
                        },
                        '& .MuiSlider-mark[data-index="0"], .MuiSlider-mark[data-index="1"], .MuiSlider-mark[data-index="2"], .MuiSlider-mark[data-index="3"], .MuiSlider-mark[data-index="4"]': {
                          height: 16,
                          width: 4,
                          backgroundColor: '#2196f3',
                        },
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 2, mt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography></Typography>
                      <Typography>Length:</Typography>
                      <Typography></Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                          type="number"
                          value={tempInputs.length}
                          onChange={handleManualSizeChange('length')}
                          onBlur={handleInputBlur('length')}
                          onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                          inputProps={{ 
                            min: MAP_SIZE_CONFIG.min, 
                            max: MAP_SIZE_CONFIG.max,
                            style: { textAlign: 'right' }
                          }}
                          size="small"
                          sx={{ width: 100 }}
                        />
                        <Typography sx={{ ml: 1 }}>blocks</Typography>
                      </Box>
                    </Box>
                    <Slider
                      value={state.size.length}
                      min={MAP_SIZE_CONFIG.min}
                      max={MAP_SIZE_CONFIG.max}
                      step={100}
                      onChange={handleSizeChange('length')}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 1000, label: '1k' },
                        { value: 5000, label: '5k' },
                        { value: 10000, label: '10k' },
                        { value: 20000, label: '20k' },
                        { value: 25000, label: '25k' },
                      ]}
                      sx={{
                        '& .MuiSlider-mark': {
                          height: 10,
                          width: 2,
                          backgroundColor: '#bfbfbf',
                        },
                        '& .MuiSlider-markActive': {
                          backgroundColor: '#fff',
                        },
                        '& .MuiSlider-mark[data-index="0"], .MuiSlider-mark[data-index="1"], .MuiSlider-mark[data-index="2"], .MuiSlider-mark[data-index="3"], .MuiSlider-mark[data-index="4"]': {
                          height: 16,
                          width: 4,
                          backgroundColor: '#2196f3',
                        },
                      }}
                    />
                  </Box>
                  <Typography>Total Area: {formatArea(state.area)} million blocks</Typography>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography>
                      Delivery Time: {state.size.deliveryDays} days 
                      (Recommended: {state.recommendedDays} days)
                    </Typography>
                    <Slider
                      value={state.size.deliveryDays}
                      min={1}
                      max={120}
                      step={1}
                      onChange={handleSizeChange('deliveryDays')}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 1, label: '1d' },
                        { value: 30, label: '30d' },
                        { value: 60, label: '60d' },
                        { value: 120, label: '120d' },
                      ]}
                    />
                    {state.size.deliveryDays < state.recommendedDays && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        Faster delivery will increase the price by ${PRICE_PER_DAY_ADJUSTMENT * (state.recommendedDays - state.size.deliveryDays)} 
                        (${PRICE_PER_DAY_ADJUSTMENT} per day below recommended)
                      </Alert>
                    )}
                    {state.size.deliveryDays > state.recommendedDays && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Extended delivery time reduces the price by ${PRICE_PER_DAY_ADJUSTMENT * (state.size.deliveryDays - state.recommendedDays)}
                        (${PRICE_PER_DAY_ADJUSTMENT} per extra day)
                      </Alert>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Paper>
        </Grid>

        {/* Formula preview and live values (power-law) */}
        <Grid item xs={12} md={12}>
          <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: '#fff' }}>
            <Typography variant="h6" gutterBottom>
              Pricing Formula (live preview)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                <BlockMath math={texFormula} />
                <Box sx={{ mt: 1 }}>
                  <BlockMath math={texA} />
                </Box>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">Width: {state.size.width} blocks</Typography>
              <Typography variant="body2">Length: {state.size.length} blocks</Typography>
              <Typography variant="body2">Area: {rectArea.toLocaleString()} blocks ({formatNumber(A)} million)</Typography>
              <Typography variant="body2">Derived size (sqrt(area)): {formatNumber(derivedSize, 0)} blocks</Typography>
              <Typography variant="body2">Raw Pbase: ${formatNumber(rawPbase)}</Typography>
              {derivedSize >= SIZE_THRESHOLD ? (
                <Typography variant="body2" sx={{ color: 'warning.main' }}>
                  Size ≥ {SIZE_THRESHOLD} → applied multiplier 1.96 → Adjusted Pbase: ${formatNumber(PbaseAdjusted)}
                </Typography>
              ) : (
                <Typography variant="body2">Adjusted Pbase: ${formatNumber(PbaseAdjusted)}</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 4, backgroundColor: '#fff' }}>
            <Typography variant="h6" gutterBottom>
              Additional Features
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Feature</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Price per unit</TableCell>
                    <TableCell align="right">Days per unit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Regular features */}
                  {Object.entries(state.features).map(([key, feature]) => {
                    if (key !== 'structures' && key !== 'customFeature') {
                      return renderFeatureRow(
                        key,
                        feature as Feature,
                        (field) => handleFeatureChange(key, false, field)
                      );
                    }
                    return null;
                  })}

                  {/* Structure features */}
                  {Object.entries(state.features.structures).map(([key, feature]) => 
                    renderFeatureRow(
                      key,
                      feature as Feature,
                      (field) => handleFeatureChange(key, true, field)
                    )
                  )}

                  {/* Custom feature */}
                  {renderFeatureRow(
                    'customFeature',
                    state.features.customFeature,
                    (field) => handleFeatureChange('customFeature', false, field),
                    true
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              backgroundColor: '#1976d2',
              color: 'white',
              height: '100%'
            }}
          >
            <Typography variant="h4" gutterBottom align="center">
              Total Price
            </Typography>

            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 2
            }}>
              <Typography variant="h5">
                ${state.totalPrice}
              </Typography>
              <Typography variant="h5">
                {state.totalDays} days
              </Typography>
            </Box>

            {state.totalDays !== state.recommendedDays && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2,
                px: 1
              }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: state.totalDays > state.recommendedDays ? '#ff4444' : '#4caf50',
                    whiteSpace: 'nowrap',
                    fontSize: '1.1rem'
                  }}
                >
                  {Math.abs(state.totalDays - state.recommendedDays)} days {state.totalDays > state.recommendedDays ? 'slower' : 'faster'}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: state.totalDays > state.recommendedDays ? '#4caf50' : '#ff4444',
                    whiteSpace: 'nowrap',
                    fontSize: '1.1rem'
                  }}
                >
                  {state.totalDays > state.recommendedDays ? 'Savings' : 'Additional cost'}: ${Math.abs((state.totalDays - state.recommendedDays) * PRICE_PER_DAY_ADJUSTMENT)}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />

            <Typography variant="subtitle2" gutterBottom>
              Base map ({formatArea(state.area)}M blocks): ${state.basePrice}
            </Typography>

            {getEnabledFeatures().length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Additional Features:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {getEnabledFeatures().map((feature, index) => (
                    <Typography 
                      key={index}
                      variant="body2" 
                      sx={{ 
                        mb: 0.5,
                        fontSize: '0.9rem',
                        color: 'rgba(255,255,255,0.9)'
                      }}
                    >
                      {feature.name}: ${feature.price} ({feature.days}d)
                    </Typography>
                  ))}
                </Box>
              </>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                fullWidth
                onClick={handleClear}
                sx={{ 
                  backgroundColor: '#ff4444',
                  '&:hover': {
                    backgroundColor: '#cc0000'
                  }
                }}
              >
                Clear
              </Button>
              <Button 
                variant="contained" 
                fullWidth
                onClick={handleConfirmOrder}
                sx={{ 
                  backgroundColor: '#4caf50',
                  '&:hover': {
                    backgroundColor: '#388e3c'
                  }
                }}
              >
                Confirm Order
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}; 