import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Venue } from '../types';

const AdminPage: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const [venues, setVenues] = useState<Venue[]>([]);
    const [placeId, setPlaceId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isLoggedIn || !db) return;

        const venuesCollection = collection(db, 'venues');
        const q = query(venuesCollection, orderBy('name'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const venuesList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Venue));
            setVenues(venuesList);
        }, (error) => {
            console.error("Error listening to venues collection:", error);
            setError("재즈바 목록을 불러오는 데 실패했습니다.");
        });

        return () => unsubscribe();
    }, [isLoggedIn]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === 'admin' && password === 'admin123') {
            setIsLoggedIn(true);
            setError('');
        } else {
            setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
    };

    const handleAddVenue = async () => {
        if (!placeId.trim()) {
            alert('Google Place ID를 입력해주세요.');
            return;
        }
        setLoading(true);
        try {
            const functions = getFunctions();
            const fetchAndSaveVenue = httpsCallable(functions, 'fetchAndSaveVenue');
            const result = await fetchAndSaveVenue({ placeId: placeId.trim() });
            alert(`성공적으로 추가되었습니다: ${(result.data as any).message}`);
            setPlaceId('');
        } catch (error) {
            console.error('Error calling fetchAndSaveVenue:', error);
            alert(`추가에 실패했습니다: ${(error as any).message}`);
        } finally {
            setLoading(false);
        }
    };

    const pageStyle: React.CSSProperties = {
        padding: '20px',
        fontFamily: 'sans-serif',
        color: '#333',
        height: '100vh',
        overflowY: 'auto',
        backgroundColor: '#f4f4f9',
    };

    const containerStyle: React.CSSProperties = {
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px',
        marginBottom: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
    };

    const buttonStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: '#007bff',
        color: 'white',
        cursor: 'pointer',
        fontSize: '16px',
    };
    
    const disabledButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: '#aaa',
        cursor: 'not-allowed',
    };

    const errorStyle: React.CSSProperties = {
        color: 'red',
        marginBottom: '10px',
    };

    const listStyle: React.CSSProperties = {
        listStyleType: 'none',
        padding: 0,
        marginTop: '20px',
    };

    const listItemStyle: React.CSSProperties = {
        backgroundColor: '#f9f9f9',
        border: '1px solid #eee',
        padding: '10px',
        marginBottom: '5px',
        borderRadius: '4px',
    };

    if (!isLoggedIn) {
        return (
            <div style={pageStyle}>
                <div style={containerStyle}>
                    <h1 style={{ textAlign: 'center' }}>Admin Login</h1>
                    <form onSubmit={handleLogin}>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={inputStyle}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={inputStyle}
                        />
                        {error && <p style={errorStyle}>{error}</p>}
                        <button type="submit" style={buttonStyle}>Login</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            <div style={containerStyle}>
                <h1 style={{ textAlign: 'center' }}>Jazzlink Admin Dashboard</h1>

                <div style={{ marginBottom: '30px' }}>
                    <h2>재즈바 추가</h2>
                    <input
                        type="text"
                        placeholder="Google Place ID"
                        value={placeId}
                        onChange={(e) => setPlaceId(e.target.value)}
                        style={inputStyle}
                    />
                    <button onClick={handleAddVenue} style={loading ? disabledButtonStyle : buttonStyle} disabled={loading}>
                        {loading ? '추가 중...' : '추가'}
                    </button>
                </div>

                <div>
                    <h2>현재 등록된 재즈바 목록 ({venues.length}개)</h2>
                    <ul style={listStyle}>
                        {venues.map(venue => (
                            <li key={venue.id} style={listItemStyle}>
                                <strong>{venue.name}</strong>
                                <p style={{ margin: '5px 0 0', color: '#666', fontSize: '14px' }}>{venue.address}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
