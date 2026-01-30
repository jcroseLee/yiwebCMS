import {
    RotateRightOutlined,
    UndoOutlined,
    ZoomInOutlined,
    ZoomOutOutlined
} from '@ant-design/icons';
import { Button, Space, Tooltip } from 'antd';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

interface ReviewImageViewerProps {
    imageUrl: string;
}

export interface ReviewImageViewerRef {
    reset: () => void;
}

export const ReviewImageViewer = forwardRef<ReviewImageViewerRef, ReviewImageViewerProps>(({ imageUrl }, ref) => {
    const [rotation, setRotation] = useState(0);
    const transformRef = useRef<ReactZoomPanPinchRef>(null);

    useImperativeHandle(ref, () => ({
        reset: () => {
            if (transformRef.current) {
                transformRef.current.resetTransform();
            }
            setRotation(0);
        }
    }));

    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <TransformWrapper
                ref={transformRef}
                initialScale={1}
                minScale={0.1}
                maxScale={8}
                centerOnInit
                wheel={{ step: 0.1 }}
                doubleClick={{ disabled: false }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <div style={{ 
                            marginBottom: 16, 
                            display: 'flex', 
                            justifyContent: 'center',
                            background: '#f5f5f5',
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #e8e8e8'
                        }}>
                            <Space>
                                <Tooltip title="放大">
                                    <Button icon={<ZoomInOutlined />} onClick={() => zoomIn()}>放大</Button>
                                </Tooltip>
                                <Tooltip title="缩小">
                                    <Button icon={<ZoomOutOutlined />} onClick={() => zoomOut()}>缩小</Button>
                                </Tooltip>
                                <Tooltip title="复位">
                                    <Button icon={<UndoOutlined />} onClick={() => {
                                        resetTransform();
                                        setRotation(0);
                                    }}>复位</Button>
                                </Tooltip>
                                <Tooltip title="旋转">
                                    <Button icon={<RotateRightOutlined />} onClick={handleRotate}>旋转</Button>
                                </Tooltip>
                            </Space>
                        </div>
                        <div style={{ 
                            flex: 1, 
                            overflow: 'hidden', 
                            border: '1px solid #d9d9d9', 
                            borderRadius: '6px',
                            background: '#333', // Dark background for better contrast
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'relative'
                        }}>
                            <TransformComponent 
                                wrapperStyle={{ 
                                    width: '100%', 
                                    height: '100%',
                                }}
                                contentStyle={{
                                    width: '100%', 
                                    height: '100%',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}
                            >
                                <img 
                                    src={imageUrl} 
                                    alt="Review content" 
                                    style={{ 
                                        maxWidth: '100%', 
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        transform: `rotate(${rotation}deg)`,
                                        transition: 'transform 0.3s ease',
                                        cursor: 'grab'
                                    }} 
                                />
                            </TransformComponent>
                        </div>
                    </>
                )}
            </TransformWrapper>
        </div>
    );
});
