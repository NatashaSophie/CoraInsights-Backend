import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import { request } from 'strapi-helper-plugin';
import TrackedPathMap from '../../components/TrackedPathMap';

const TrailRouteEditView = () => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const match = useRouteMatch('/plugins/content-manager/collectionType/application::trail-route.trail-route/:id');

  React.useEffect(() => {
    if (match?.params?.id) {
      fetchData(match.params.id);
    }
  }, [match]);

  const fetchData = async (id) => {
    try {
      setLoading(true);
      const response = await request(`/trail-routes/${id}`, {
        method: 'GET',
      });
      setData(response);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!match) return null;
  if (loading) return <div>Carregando...</div>;
  if (!data) return null;

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Caminho GPS Registrado</h2>
      <TrackedPathMap value={data.trackedPath} />
    </div>
  );
};

export default TrailRouteEditView;
